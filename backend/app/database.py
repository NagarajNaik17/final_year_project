import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "doc_verify")

client = MongoClient(MONGO_URI)
db = client[DATABASE_NAME]

try:
    db.users.create_index("email", unique=True)
    db.users.create_index("username", unique=True)
except Exception as e:
    pass

def get_db():
    return db
