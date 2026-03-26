from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "doc_verification")

client = MongoClient(MONGO_URI)
db = client[DATABASE_NAME]

result = db.documents.update_many(
    {"total_score": {"$lt": 50.0}, "status": "Approved"},
    {"$set": {"status": "Pending"}}
)
print(f"Fixed {result.modified_count} incorrectly approved documents.")

# Also normalize user_id for any existing string documents just in case
from bson import ObjectId
docs = db.documents.find({})
fixed_ids = 0
for d in docs:
    uid = d.get("user_id")
    if uid and isinstance(uid, str) and len(uid) == 24:
        db.documents.update_one({"_id": d["_id"]}, {"$set": {"user_id": ObjectId(uid)}})
        fixed_ids += 1
print(f"Normalized {fixed_ids} user_id fields to ObjectId.")
