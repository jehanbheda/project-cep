"""
orchestrator.py
---------------
Single entry point for schedule generation.
Tasks are spread EVENLY across available days until deadline.
NO COLLISIONS between tasks from different goals.
"""

from datetime import datetime, timedelta
from agents import run_selector, duration_agent, break_agent


# ─────────────────────────────────────────────
# SECTION BUDGET
# ─────────────────────────────────────────────

SECTION_CEILING = {
    0: {"multiplier": 1.2, "break_budget": 10},
    1: {"multiplier": 1.35, "break_budget": 15},
    2: {"multiplier": 1.5, "break_budget": 30},
}

# Time blocks (2-hour slots from 8 AM to 10 PM)
TIME_SLOTS = [
    (8, 0, 10, 0),     # 8:00 - 10:00
    (10, 0, 12, 0),    # 10:00 - 12:00
    (12, 0, 14, 0),    # 12:00 - 14:00
    (14, 0, 16, 0),    # 14:00 - 16:00
    (16, 0, 18, 0),    # 16:00 - 18:00
    (18, 0, 20, 0),    # 18:00 - 20:00
    (20, 0, 22, 0),    # 20:00 - 22:00
]


# ─────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────

def _deadline_pressure(deadline: datetime, now: datetime) -> int:
    hours = (deadline - now).total_seconds() / 3600
    if hours >= 72:
        return 0
    if hours >= 24:
        return 1
    return 2


def _fatigue_bucket(raw: int) -> int:
    if raw <= 3:
        return 0
    if raw <= 6:
        return 1
    return 2


def _session_position(index: int, total: int) -> int:
    ratio = index / max(total, 1)
    if ratio < 0.3:
        return 0
    if ratio < 0.7:
        return 1
    return 2


def _hour_to_block(hour: int) -> int:
    if hour < 8:
        return 0
    if hour < 10:
        return 1
    if hour < 12:
        return 2
    if hour < 14:
        return 3
    if hour < 16:
        return 4
    if hour < 18:
        return 5
    if hour < 20:
        return 6
    return 0


# ─────────────────────────────────────────────
# GLOBAL TIME SLOT MANAGER (shared across ALL goals)
# ─────────────────────────────────────────────

class GlobalTimeSlotManager:
    """Manages time slots across ALL days and ALL goals to prevent collisions."""

    def __init__(self):
        # Key: date string (YYYY-MM-DD), Value: list of used (start, end) tuples for that day
        self.used_slots_by_day = {}

    def get_available_slot(self, date: datetime, duration_min: int) -> datetime:
        """Find the next available time slot on a specific date."""

        # Use string format for dictionary key (YYYY-MM-DD)
        date_key = date.strftime('%Y-%m-%d')

        if date_key not in self.used_slots_by_day:
            self.used_slots_by_day[date_key] = []

        used_slots = self.used_slots_by_day[date_key]

        for slot_start_hour, slot_start_min, slot_end_hour, slot_end_min in TIME_SLOTS:
            slot_start = date.replace(
                hour=slot_start_hour, minute=slot_start_min, second=0, microsecond=0)
            slot_end = date.replace(
                hour=slot_end_hour, minute=slot_end_min, second=0, microsecond=0)
            slot_duration = int((slot_end - slot_start).total_seconds() / 60)

            if duration_min > slot_duration:
                continue

            collision = False
            for used_start, used_end in used_slots:
                if not (slot_end <= used_start or slot_start >= used_end):
                    collision = True
                    break

            if not collision:
                task_end = slot_start + timedelta(minutes=duration_min)
                used_slots.append((slot_start, task_end))
                return slot_start

        return None

    def reset_day(self, date: datetime):
        """Reset used slots for a specific day (when moving to next day)."""
        date_key = date.strftime('%Y-%m-%d')
        self.used_slots_by_day[date_key] = []


# ─────────────────────────────────────────────
# FEASIBILITY CHECK
# ─────────────────────────────────────────────

def _check_feasibility(tasks: list[dict], now: datetime, deadline: datetime) -> list[dict]:
    from agents import MAX_MULTIPLIER
    infeasible = []
    for task in tasks:
        worst_min = task["base_duration_min"] * \
            MAX_MULTIPLIER[task["difficulty"]]
        hours_left = (deadline - now).total_seconds() / 3600
        if (worst_min / 60) > hours_left:
            infeasible.append(task)
            print(
                f"  Task infeasible: {task.get('task_name', task['task_id'])}")
    return infeasible


# ─────────────────────────────────────────────
# SPREAD TASKS EVENLY ACROSS DAYS (NO COLLISIONS)
# ─────────────────────────────────────────────

def _distribute_across_days_with_slots(
    ordered_tasks: list[dict],
    start_date: datetime,
    deadline: datetime,
    hours_per_day: float,
    global_slot_manager: GlobalTimeSlotManager
) -> tuple[list[dict], list[dict]]:
    """
    Spread tasks EVENLY across all available days until deadline.
    Uses GLOBAL slot manager to prevent collisions across ALL goals.
    """
    if not ordered_tasks:
        return [], []

    # Calculate available days until deadline
    days_available = max(1, (deadline - start_date).days)

    # Calculate total estimated hours
    total_hours = sum(
        (t["base_duration_min"] * SECTION_CEILING[t["difficulty"]]["multiplier"]) / 60
        for t in ordered_tasks
    )

    # Calculate hours per day (spread evenly)
    hours_per_day_limit = max(3, total_hours / days_available)
    # Cap at 8 hours per day maximum (reasonable study limit)
    hours_per_day_limit = min(hours_per_day_limit, 8)

    print(f"  Days available until deadline: {days_available}")
    print(f"  Total hours: {total_hours:.1f}h")
    print(f"  Hours per day target: {hours_per_day_limit:.1f}h")

    tasks_with_days = []
    unschedulable_tasks = []

    current_day = 0
    day_hours_used = 0
    current_date = start_date.replace(
        hour=8, minute=0, second=0, microsecond=0)

    for task in ordered_tasks:
        task_duration_min = int(
            task["base_duration_min"] *
            SECTION_CEILING[task["difficulty"]]["multiplier"]
        )
        task_duration_hours = task_duration_min / 60

        # Calculate current date
        current_date = start_date + timedelta(days=current_day)

        # Check if current day is past deadline
        if current_date > deadline:
            unschedulable_tasks.append(task)
            print(
                f"  Task '{task.get('task_name', task['task_id'])}' cannot fit before deadline")
            continue

        # If adding this task exceeds daily limit, move to next day
        if day_hours_used + task_duration_hours > hours_per_day_limit and day_hours_used > 0:
            current_day += 1
            day_hours_used = 0
            current_date = start_date + timedelta(days=current_day)

            if current_date > deadline:
                unschedulable_tasks.append(task)
                continue

        # Find time slot using GLOBAL slot manager (prevents collisions across goals)
        slot_start = global_slot_manager.get_available_slot(
            current_date, task_duration_min)

        if slot_start is None:
            # Try next day if no slot available
            current_day += 1
            day_hours_used = 0
            current_date = start_date + timedelta(days=current_day)

            if current_date > deadline:
                unschedulable_tasks.append(task)
                continue

            slot_start = global_slot_manager.get_available_slot(
                current_date, task_duration_min)

            if slot_start is None:
                unschedulable_tasks.append(task)
                print(
                    f"  No time slot for task: {task.get('task_name', task['task_id'])}")
                continue

        task_end = slot_start + timedelta(minutes=task_duration_min)

        task_copy = task.copy()
        task_copy["scheduled_date"] = current_date
        task_copy["scheduled_start"] = slot_start
        task_copy["scheduled_end"] = task_end
        task_copy["scheduled_duration_min"] = task_duration_min

        tasks_with_days.append(task_copy)
        day_hours_used += task_duration_hours

    actual_days_used = current_day + 1
    print(
        f"  Scheduled {len(tasks_with_days)} tasks across {actual_days_used} days")
    print(
        f"  Average tasks per day: {len(tasks_with_days) / actual_days_used:.1f}")

    return tasks_with_days, unschedulable_tasks


# ─────────────────────────────────────────────
# SECTION CONSTRUCTION
# ─────────────────────────────────────────────

def _build_sections(
    ordered_tasks: list[dict],
    user_id: str,
    user_state: dict,
    now: datetime,
    deadline: datetime,
    hours_per_day: float,
    global_slot_manager: GlobalTimeSlotManager
) -> tuple[list[dict], list[dict]]:

    tasks_with_days, unschedulable = _distribute_across_days_with_slots(
        ordered_tasks, now, deadline, hours_per_day, global_slot_manager
    )

    sections = []
    for task in tasks_with_days:
        difficulty = task["difficulty"]
        task_start = task["scheduled_start"]

        deadline_pressure = _deadline_pressure(deadline, task_start)

        dur = duration_agent(
            user_id=user_id,
            task_type=task["task_type"],
            difficulty=difficulty,
            deadline_pressure=deadline_pressure,
            base_duration_min=task["base_duration_min"],
            efficiency_profile={},
        )

        scheduled_duration_min = dur["scheduled_duration_min"]
        task_end = task_start + timedelta(minutes=scheduled_duration_min)

        section = {
            "task_id": task["task_id"],
            "task_type": task["task_type"],
            "difficulty": difficulty,
            "break_duration_min": 0,
            "scheduled_duration_min": scheduled_duration_min,
            "start_time": task_start.isoformat(),
            "end_time": task_end.isoformat(),
            "duration_action": dur["action"],
            "break_action": "no_break",
            "context_switch_action": "switch_now",
            "time_action": f"block_{_hour_to_block(task_start.hour)}",
            "duration_state": {
                "task_type": task["task_type"],
                "difficulty": difficulty,
                "deadline_pressure": deadline_pressure,
            },
            "time_state": {
                "hour_block": _hour_to_block(task_start.hour),
                "task_type": task["task_type"],
            },
            "break_state": {
                "fatigue_level": _fatigue_bucket(user_state.get("fatigue_raw", 3)),
                "consecutive_minutes_bucket": 0,
                "prev_task_type": "none",
                "next_task_type": task["task_type"],
                "next_task_difficulty": difficulty,
            },
            "context_switch_state": {
                "prev_task_type": "none",
                "next_task_type": task["task_type"],
                "session_position": 0,
            },
            "cold_start_duration": dur["cold_start"],
            "cold_start_break": True,
            "source": task.get("source", "new"),
        }
        sections.append(section)

    return sections, unschedulable


# ─────────────────────────────────────────────
# PUBLIC API
# ─────────────────────────────────────────────

def generate_schedule(
    user_id: str,
    tasks: list[dict],
    user_state: dict,
    now: datetime,
) -> dict:
    return _run(user_id, tasks, user_state, now)


def regenerate_schedule(
    user_id: str,
    pending_tasks: list[dict],
    failed_tasks: list[dict],
    user_state: dict,
    now: datetime,
) -> dict:
    for t in pending_tasks:
        t["source"] = "pending"
    for t in failed_tasks:
        t["source"] = "failed"
    pool = pending_tasks + failed_tasks
    return _run(user_id, pool, user_state, now)


# ─────────────────────────────────────────────
# INTERNAL RUNNER
# ─────────────────────────────────────────────

def _run(
    user_id: str,
    pool: list[dict],
    user_state: dict,
    now: datetime,
) -> dict:
    # Fix timezone issues
    if hasattr(now, 'tzinfo') and now.tzinfo:
        now = now.replace(tzinfo=None)

    for t in pool:
        if t.get("deadline") and hasattr(t["deadline"], 'tzinfo') and t["deadline"].tzinfo:
            t["deadline"] = t["deadline"].replace(tzinfo=None)

    if not pool:
        return {"sections": [], "unschedulable": [], "infeasible": []}

    # Find the earliest deadline from all tasks
    deadlines = [t.get("deadline") for t in pool if t.get("deadline")]
    if deadlines:
        deadline = min(deadlines)
    else:
        deadline = now + timedelta(days=7)

    print(f"\n=== Generating Schedule ===")
    print(f"  User: {user_id}")
    print(f"  Tasks in pool: {len(pool)}")
    print(f"  Deadline: {deadline.date()}")
    print(f"  Start: {now.date()}")

    hours_per_day = 24  # Not used as hard limit - spreading logic handles distribution

    # Check feasibility
    infeasible = _check_feasibility(pool, now, deadline)
    infeasible_ids = {t["task_id"] for t in infeasible}
    schedulable_pool = [t for t in pool if t["task_id"] not in infeasible_ids]

    if not schedulable_pool:
        return {
            "sections": [],
            "unschedulable": [],
            "infeasible": infeasible,
        }

    # Run selector to order tasks
    ordered_tasks, unschedulable = run_selector(
        pool=schedulable_pool,
        user_state={"fatigue_level": _fatigue_bucket(
            user_state.get("fatigue_raw", 3))},
        user_id=user_id,
        now=now,
    )

    if not ordered_tasks:
        return {
            "sections": [],
            "unschedulable": unschedulable,
            "infeasible": infeasible,
        }

    # Create GLOBAL slot manager to prevent collisions across ALL goals
    global_slot_manager = GlobalTimeSlotManager()

    # Build sections with even distribution and collision prevention
    sections, deadline_unschedulable = _build_sections(
        ordered_tasks=ordered_tasks,
        user_id=user_id,
        user_state=user_state,
        now=now,
        deadline=deadline,
        hours_per_day=hours_per_day,
        global_slot_manager=global_slot_manager,
    )

    # Combine unschedulable lists
    all_unschedulable = []
    for t in unschedulable:
        if t not in all_unschedulable:
            all_unschedulable.append(t)
    for t in deadline_unschedulable:
        if t not in all_unschedulable:
            all_unschedulable.append(t)

    # Log results
    dates = {}
    for s in sections:
        date = s["start_time"][:10]
        dates[date] = dates.get(date, 0) + 1

    print(f"\n  Schedule generated: {len(sections)} tasks")
    for date, count in sorted(dates.items()):
        print(f"    {date}: {count} tasks")
    print(f"  Unschedulable: {len(all_unschedulable)}")
    print(f"  Infeasible: {len(infeasible)}")

    return {
        "sections": sections,
        "unschedulable": all_unschedulable,
        "infeasible": infeasible,
    }
