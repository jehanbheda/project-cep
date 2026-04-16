from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv("MONGODB_URI"))
db = client["manovyavastha"]

print("Clearing data (keeping users and collections)...")

# Delete all documents but keep collections
db.tasks.delete_many({})
db.goals.delete_many({})
db.scheduledsessions.delete_many({})
db.qtables.delete_many({})
db.qtable_duration.delete_many({})
db.qtable_time.delete_many({})
db.qtable_break.delete_many({})
db.qtable_context_switch.delete_many({})


print("✅ All tasks, goals, sessions, and Q-tables cleared!")
print("✅ Users collection preserved")
print("✅ Collections structure preserved")