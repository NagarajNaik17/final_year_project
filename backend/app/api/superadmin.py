import logging
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from app.database import get_db
from app.models.user import UserCreateAdmin
from app.auth_utils import get_password_hash
from app.auth_deps import require_superadmin
from app.services.blockchain import store_document_hash_on_blockchain, check_document_exists_on_blockchain
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
# Set basic logging
logging.basicConfig(level=logging.INFO)

router = APIRouter()

@router.post("/create-admin")
def create_admin(user: UserCreateAdmin, current_user: dict = Depends(require_superadmin)):
    db = get_db()
    
    if db.users.find_one({"email": user.email}):
        return {"success": False, "message": "Email already registered"}
        
    if db.users.find_one({"username": user.name}):
        return {"success": False, "message": "Name already registered"}
    
    new_admin = {
        "username": user.name,
        "email": user.email,
        "password": get_password_hash(user.password),
        "role": "Admin",
        "created_at": datetime.now(timezone.utc)
    }
    
    db.users.insert_one(new_admin)
    logger.info(f"SuperAdmin {current_user['username']} created a new Admin: {user.name}")
    
    return {"success": True, "message": "Admin created successfully", "data": {"name": user.name, "email": user.email}}

@router.get("/admins")
def get_admins(current_user: dict = Depends(require_superadmin)):
    db = get_db()
    admins = list(db.users.find({"role": "Admin"}, {"password": 0}))
    for admin in admins:
        admin["_id"] = str(admin["_id"])
    return {"success": True, "message": "Admins fetched successfully", "data": admins}

@router.delete("/admin/{id}")
def delete_admin(id: str, current_user: dict = Depends(require_superadmin)):
    db = get_db()
    admin_to_delete = db.users.find_one({"_id": ObjectId(id)})
    
    if not admin_to_delete:
        return {"success": False, "message": "Admin not found"}
        
    if admin_to_delete.get("role") == "Super Admin":
        return {"success": False, "message": "Cannot delete a Super Admin account"}
        
    db.users.delete_one({"_id": ObjectId(id)})
    logger.info(f"SuperAdmin {current_user['username']} deleted Admin {admin_to_delete.get('username')}")
    
    return {"success": True, "message": "Admin deleted successfully", "data": None}

@router.put("/approve-document/{id}")
def approve_document(id: str, current_user: dict = Depends(require_superadmin)):
    db = get_db()
    doc = db.documents.find_one({"_id": ObjectId(id)})
    if not doc:
        return {"success": False, "message": "Document not found"}
        
    if doc.get("status") == "Approved":
        return {"success": False, "message": "Already approved"}
        
    # Check blockchain duplicates first BEFORE storing
    exists = check_document_exists_on_blockchain(doc["hash_value"])
    if exists:
         db.documents.update_one(
             {"_id": ObjectId(id)},
             {"$set": {"status": "duplicate"}}
         )
         return {"success": True, "message": "Document already exists on blockchain (Duplicate)", "data": {"status": "duplicate"}}
        
    doc_type = doc.get("doc_type", doc.get("document_type", "Unknown"))
    tx_hash = store_document_hash_on_blockchain(doc["hash_value"], doc_type)
    
    db.documents.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"status": "Approved", "blockchain_tx_hash": tx_hash}}
    )
    
    logger.info(f"Document {id} approved manually and stored on blockchain by SuperAdmin {current_user['username']}")
    return {"success": True, "message": "Document Approved and stored on blockchain", "data": {"tx_hash": tx_hash, "status": "Approved"}}

@router.put("/reject-document/{id}")
def reject_document(id: str, current_user: dict = Depends(require_superadmin)):
    db = get_db()
    doc = db.documents.find_one({"_id": ObjectId(id)})
    if not doc:
        return {"success": False, "message": "Document not found"}
        
    db.documents.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"status": "Rejected"}}
    )
    
    logger.info(f"Document {id} rejected manually by SuperAdmin {current_user['username']}")
    return {"success": True, "message": "Document rejected successfully", "data": None}
