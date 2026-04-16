from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv("MONGODB_URI"))
db = client["manovyavastha"]

# Get user IDs (run this after creating both users)
users = list(db.users.find({}, {"_id": 1, "email": 1}))
print("\n" + "="*70)
print("📊 Q-VALUE COMPARISON: NIGHT OWL vs MORNING THEORIST")
print("="*70)

for user in users:
    email = user['email']
    user_id = user['_id']
    
    print(f"\n{'='*70}")
    print(f"👤 USER: {email}")
    print(f"{'='*70}")
    
    # Duration agent preferences
    print("\n--- DURATION PREFERENCES ---")
    durations = db.qtable_duration.find({"user_id": str(user_id)}, {"action": 1, "q_value": 1})
    for d in durations:
        print(f"  {d['action']}: q_value = {d['q_value']:.3f}")
    
    # Time agent preferences (hour blocks)
    print("\n--- TIME PREFERENCES ---")
    times = db.qtable_time.find({"user_id": str(user_id)}, {"action": 1, "q_value": 1})
    for t in times:
        block = t['action'].replace('block_', '')
        hour_map = {'0': 'Midnight-8AM', '1': '8-10AM', '2': '10-12PM', '3': '12-2PM', '4': '2-4PM', '5': '4-6PM', '6': '6-8PM', '7': '8-10PM'}
        print(f"  {hour_map.get(block, block)}: q_value = {t['q_value']:.3f}")

print("\n" + "="*70)
print("✅ Compare the differences!")
print("   Night Owl should have higher q_values for evening blocks & coding")
print("   Morning Theorist should have higher q_values for morning blocks & theory")