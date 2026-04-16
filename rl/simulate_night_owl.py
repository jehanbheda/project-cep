#!/usr/bin/env python3
import requests
import time
import random

BACKEND_URL = "http://localhost:5000/api"
EMAIL = "night@gmail.com"
PASSWORD = "123456"

def login():
    response = requests.post(f"{BACKEND_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    return response.json().get('token')

def submit_feedback(token, task_id, outcome, feedback, duration=None, fatigue=5):
    headers = {"Authorization": f"Bearer {token}"}
    data = {"taskId": task_id, "outcome": outcome, "feedback": feedback, "fatigueAfter": fatigue}
    if duration:
        data["actualDurationMin"] = duration
    requests.post(f"{BACKEND_URL}/feedback/submit", json=data, headers=headers)

def simulate():
    token = login()
    print(f"Simulating 7 days for NIGHT OWL CODER...")
    
    for day in range(1, 8):
        # Get schedule
        headers = {"Authorization": f"Bearer {token}"}
        resp = requests.get(f"{BACKEND_URL}/schedule/today", headers=headers)
        sessions = resp.json().get('schedule', {}).get('sessions', [])
        
        for session in sessions:
            task = session.get('taskId')
            if not task:
                continue
            
            task_title = task.get('title', '')
            task_id = task.get('_id')
            
            # Night owl behavior: good at coding at night
            if 'coding' in task_title.lower() or 'algorithm' in task_title.lower():
                # Coding tasks: complete quickly (85% of scheduled time)
                outcome = "completed"
                duration = int(session.get('scheduledDurationMin', 60) * 0.85)
                feedback = []
                print(f"  ✅ CODING: {task_title[:40]} → Completed in {duration} min")
            elif 'theory' in task_title.lower() or 'concept' in task_title.lower():
                # Theory tasks: fail
                outcome = "failed"
                duration = None
                feedback = ['F3', 'F4']  # Wrong time, too difficult
                print(f"  ❌ THEORY: {task_title[:40]} → Failed (wrong time)")
            else:
                # Other tasks: random
                outcome = "completed" if random.random() > 0.3 else "failed"
                duration = int(session.get('scheduledDurationMin', 60) * random.uniform(0.8, 1.2))
                feedback = []
                print(f"  📝 OTHER: {task_title[:40]} → {outcome}")
            
            submit_feedback(token, task_id, outcome, feedback, duration)
            time.sleep(0.5)
        
        # Regenerate schedule
        requests.post(f"{BACKEND_URL}/schedule/regenerate", headers=headers)
        print(f"\n  --- Day {day} complete ---\n")
        time.sleep(1)
    
    print("\n✅ Night Owl simulation complete!")

if __name__ == "__main__":
    simulate()