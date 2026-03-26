import logging
from fastapi import APIRouter, Depends
from bson import ObjectId
from app.database import get_db
from app.auth_deps import require_admin
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/dashboard-stats")
def get_dashboard_stats(current_user: dict = Depends(require_admin)):
    db = get_db()
    
    # In a full multi-tenant system you might filter users/docs by creator.
    # The prompt implies Admin sees all regular users and their documents.
    # Total Users (Employees)
    total_users = db.users.count_documents({"role": "User"})
    
    # Document totals
    approved = db.documents.count_documents({"status": "Approved"})
    pending = db.documents.count_documents({"status": {"$in": ["Pending Blockchain", "Pending", "Manual Review"]}})
    rejected = db.documents.count_documents({"status": "Rejected"})
    
    return {
        "success": True,
        "message": "Stats fetched successfully",
        "data": {
            "total_users": total_users,
            "approved": approved,
            "pending": pending,
            "rejected": rejected
        }
    }

@router.get("/users")
def get_admin_users(current_user: dict = Depends(require_admin)):
    db = get_db()
    users = list(db.users.find({"role": "User"}, {"password": 0}))
    for u in users:
        u["_id"] = str(u["_id"])
        if "user_id" in u:
            u["user_id"] = str(u["user_id"])
    return {
        "success": True,
        "message": "Users fetched successfully",
        "data": users
    }

@router.get("/my-documents")
def get_my_documents(current_user: dict = Depends(require_admin)):
    db = get_db()
    # Assuming documents are tagged with the admin who uploaded them inside owner_id, or we just show all docs for their users
    # Actually, the user asked for "documents uploaded by this admin". Our document schema in document.py uses "owner_id"
    docs = list(db.documents.find({"owner_id": current_user["id"]}))
    for d in docs:
        d["_id"] = str(d["_id"])
        if "user_id" in d:
            d["user_id"] = str(d["user_id"])
    return {
        "success": True,
        "message": "Documents fetched successfully",
        "data": docs
    }
