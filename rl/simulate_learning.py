#!/usr/bin/env python3
"""
simulate_learning.py
Simulates a week of user learning by automatically submitting feedback
This will update Q-tables in real-time for demo purposes
"""

import requests
import time
import random
from datetime import datetime, timedelta

# Configuration
BACKEND_URL = "http://localhost:5000/api"
EMAIL = "r@gmail.com"
PASSWORD = "123456"

# First, login to get token
def login():
    response = requests.post(f"{BACKEND_URL}/auth/login", json={
        "email": EMAIL,
        "password": PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Logged in as {EMAIL}")
        return data['token']
    else:
        print(f"❌ Login failed: {response.text}")
        return None

# Get today's schedule
def get_today_schedule(token):
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BACKEND_URL}/schedule/today", headers=headers)
    if response.status_code == 200:
        return response.json().get('schedule', {}).get('sessions', [])
    return []

# Submit feedback for a task
def submit_feedback(token, task_id, outcome, feedback_codes, fatigue_after=5):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    data = {
        "taskId": task_id,
        "outcome": outcome,
        "feedback": feedback_codes,
        "fatigueAfter": fatigue_after
    }
    if outcome == "completed":
        data["actualDurationMin"] = random.randint(25, 55)  # Random duration
    
    response = requests.post(f"{BACKEND_URL}/feedback/submit", json=data, headers=headers)
    return response.status_code == 200

# Simulate a day of learning
def simulate_day(token, day_num, sessions):
    print(f"\n{'='*50}")
    print(f"📅 DAY {day_num}")
    print(f"{'='*50}")
    
    # Pick 2-3 tasks from the schedule to interact with
    available_tasks = [s for s in sessions if s.get('taskId') and s.get('status') == 'scheduled']
    
    if not available_tasks:
        print("  No available tasks to simulate")
        return
    
    # Select 2-3 random tasks
    tasks_to_do = random.sample(available_tasks, min(3, len(available_tasks)))
    
    for i, session in enumerate(tasks_to_do, 1):
        task_id = session['taskId']['_id']
        task_title = session['taskId']['title']
        
        # Random outcome: 60% complete, 30% fail, 10% skip
        rand = random.random()
        if rand < 0.6:
            outcome = "completed"
            feedback = []
            print(f"  📝 Task {i}: {task_title[:30]} → COMPLETED")
        elif rand < 0.9:
            outcome = "failed"
            # Random feedback codes for failure
            feedback = random.choice([['F1'], ['F2'], ['F3'], ['F4'], ['F5'], ['F8'], ['F1', 'F3'], ['F2', 'F5']])
            print(f"  ❌ Task {i}: {task_title[:30]} → FAILED with {feedback}")
        else:
            outcome = "skipped"
            feedback = []
            print(f"  ⏭️ Task {i}: {task_title[:30]} → SKIPPED")
        
        # Submit feedback
        fatigue = random.randint(3, 8)
        success = submit_feedback(token, task_id, outcome, feedback, fatigue)
        
        if success:
            print(f"      ✅ Feedback submitted (fatigue: {fatigue})")
        else:
            print(f"      ❌ Feedback failed")
        
        # Small delay between tasks
        time.sleep(1)
    
    # After day ends, trigger regeneration (optional)
    print(f"\n  🔄 Triggering schedule regeneration...")
    headers = {"Authorization": f"Bearer {token}"}
    requests.post(f"{BACKEND_URL}/schedule/regenerate", headers=headers)
    print(f"  ✅ Regeneration triggered for next day")

# Show Q-table summary (optional - if you have an endpoint)
def show_q_table_summary():
    print(f"\n{'='*50}")
    print(f"📊 Q-TABLE SUMMARY (Current Values)")
    print(f"{'='*50}")
    print("  Check MongoDB: db.qtables.find().pretty()")
    print("  Look for changing q_value fields")

def main():
    print("\n" + "="*50)
    print("🎓 RL LEARNING SIMULATOR")
    print("="*50)
    print("\nThis will simulate 7 days of user learning")
    print("Q-values will update in real-time\n")
    
    # Login
    token = login()
    if not token:
        print("Exiting...")
        return
    
    # Simulate 7 days
    for day in range(1, 8):
        # Get current schedule
        sessions = get_today_schedule(token)
        
        if not sessions:
            print(f"\n📅 DAY {day}: No tasks scheduled. Creating a goal first!")
            # You can add goal creation here if needed
            break
        
        # Simulate the day
        simulate_day(token, day, sessions)
        
        # Wait between days (optional, to see progression)
        if day < 7:
            print(f"\n  ⏳ Moving to day {day+1}...")
            time.sleep(2)
    
    print(f"\n{'='*50}")
    print("✅ SIMULATION COMPLETE!")
    print("="*50)
    print("\n📈 The RL agent has now learned from 7 days of simulated feedback")
    print("   Q-values should show noticeable changes")
    print("\n👉 Check MongoDB to see updated Q-tables:")
    print("   db.qtables.find().pretty()")
    print("\n👉 Or restart frontend and see if task scheduling improved")

if __name__ == "__main__":
    main()