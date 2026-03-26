from fastapi import APIRouter, File, UploadFile, Depends, HTTPException, status, Form
from app.database import get_db
from app.auth_deps import require_admin, require_superadmin, get_current_user
from app.services.verification_service import process_document, calculate_sha256
from app.services.blockchain import store_document_hash_on_blockchain, check_document_exists_on_blockchain, get_document_details_from_blockchain
from bson import ObjectId
import shutil
import os

router = APIRouter()
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
def upload_document(
    file: UploadFile = File(...), 
    user_id: str = Form(...),
    doc_type: str = Form(...),
    current_user: dict = Depends(require_admin)
):
    print("\n\n" + "="*50)
    print(f"[ROUTE: /upload] Received Upload Request.")
    print(f"Target Account: {user_id} | Defined Type: {doc_type}")
    
    file_location = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)

    try:
        db = get_db()
        expected_name = ""
        try:
            target_user_id = ObjectId(user_id)
            target_user = db.users.find_one({"_id": target_user_id})
            if target_user:
                expected_name = target_user.get("username", "")
        except:
            pass

        # 1. Run AI Pipeline
        print(f"[SYSTEM] Local file locked -> {file_location}. Executing verification core... Expected Name: {expected_name}")
        result = process_document(file_location, doc_type, expected_name)
        print(f"[SYSTEM] Pipeline detached logic perfectly!")
        
        # 2. Check if hash exists on Blockchain or local DB (Only if score >= 50)
        print(f"[SYSTEM] Evaluation branch logic loaded. Duplication filter: {'ACTIVE' if result.get('total_score', 0) >= 50.0 else 'SKIPPED (Score < 50)'}")
        
        if result.get("total_score", 0) >= 50.0:
            exists_on_chain = check_document_exists_on_blockchain(result["hash_value"])
            existing_doc = db.documents.find_one({"hash_value": result["hash_value"]})
            
            if exists_on_chain or existing_doc:
                print("[SYSTEM WARNING] Identical Document Cryptographic Hash pinpointed inside Database/Blockchain! Rejecting Upload as Duplicate.")
                doc_id = str(existing_doc["_id"]) if existing_doc else None
                return {
                    "success": True,
                    "message": "Verification completed",
                    "data": {
                        "ocr_score": result.get("ocr_score", 0),
                        "ai_score": result.get("ai_score", 0),
                        "total_score": result.get("total_score", 0),
                        "status": "approved" if exists_on_chain else "pending",
                        "blockchain_status": "Duplicate",
                        "transaction_hash": existing_doc.get("blockchain_tx_hash") if existing_doc else None,
                        "doc_id": doc_id,
                        "doc_type": result.get("doc_type"),
                        "hash_value": result.get("hash_value")
                    }
                }
            
        # 3. Save to MongoDB
        print("[DATABASE] Securing completely new Document into MongoDB ledger...")
        document_data = result
        try:
            document_data["user_id"] = ObjectId(user_id)
        except:
            document_data["user_id"] = user_id
            
        document_data["owner_id"] = str(current_user["id"])
        document_data["file_url"] = file_location
        document_data["original_filename"] = file.filename
        
        inserted = db.documents.insert_one(document_data)
        print(f"[DATABASE] Saved successfully! Native Mongodb ID -> {inserted.inserted_id}")
        
        # If score >= 50, proceed to blockchain automatically
        blockchain_status = "Not Stored"
        transaction_hash = None
        if document_data["status"] == "Pending Blockchain":
            print(f"[BLOCKCHAIN] Document logic triggers automated Sepolia verification integration...")
            tx_hash = store_document_hash_on_blockchain(document_data["hash_value"], document_data["doc_type"])
            print(f"[BLOCKCHAIN] Successfully validated. Extracted Tx Hash: {tx_hash}")
            db.documents.update_one(
                {"_id": inserted.inserted_id},
                {"$set": {"status": "Approved", "blockchain_tx_hash": tx_hash}}
            )
            document_data["status"] = "Approved"
            document_data["blockchain_tx_hash"] = tx_hash
            blockchain_status = "Stored Successfully"
            transaction_hash = tx_hash
            
        document_data["_id"] = str(inserted.inserted_id)
        if "user_id" in document_data:
            document_data["user_id"] = str(document_data["user_id"])
            
        data_res = {
            "ocr_score": document_data.get("ocr_score", 0),
            "ai_score": document_data.get("ai_score", 0),
            "total_score": document_data.get("total_score", 0),
            "status": "approved" if document_data["status"] == "Approved" else "pending",
            "blockchain_status": blockchain_status,
            "transaction_hash": transaction_hash,
            "doc_type": document_data.get("doc_type"),
            "hash_value": document_data.get("hash_value")
        }
            
        print("[ROUTE COMPLETION] Upload cycle formally completed and returned natively!")
        print("="*50)
        return {"success": True, "message": "Verification completed", "data": data_res}
        
    except Exception as e:
        print(f"[CRITICAL UPLOAD FAULT] Failed explicitly at: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/verify/{doc_hash}")
def verify_public_document(doc_hash: str):
    exists_on_chain = check_document_exists_on_blockchain(doc_hash)
    if exists_on_chain:
        details = get_document_details_from_blockchain(doc_hash)
        # Find username
        db = get_db()
        doc_record = db.documents.find_one({"hash_value": doc_hash})
        username = "Unknown User"
        if doc_record and "user_id" in doc_record:
            try:
                user_oid = ObjectId(doc_record["user_id"])
            except:
                user_oid = doc_record["user_id"]
            user_record = db.users.find_one({"_id": user_oid})
            if user_record:
                username = user_record.get("username", "Unknown User")
                
        return {
            "status": "Genuine", 
            "owner_details": details["owner"] if details else "Unknown Address", 
            "document_type": details["docType"] if details else "Unknown",
            "username": username
        }
    
    return {"status": "Fake / Not Verified"}

@router.post("/verify/upload")
def verify_public_document_upload(file: UploadFile = File(...)):
    file_location = os.path.join(UPLOAD_DIR, "verify_" + file.filename)
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
        
    try:
        hash_value = calculate_sha256(file_location)
        # Check blockchain using the hash
        exists = check_document_exists_on_blockchain(hash_value)
        if exists:
            details = get_document_details_from_blockchain(hash_value)
            # Find username
            db = get_db()
            doc_record = db.documents.find_one({"hash_value": hash_value})
            username = "Unknown User"
            if doc_record and "user_id" in doc_record:
                try:
                    user_oid = ObjectId(doc_record["user_id"])
                except:
                    user_oid = doc_record["user_id"]
                user_record = db.users.find_one({"_id": user_oid})
                if user_record:
                    username = user_record.get("username", "Unknown User")
                    
            return {
                "status": "Genuine", 
                "hash_value": hash_value,
                "owner_details": details["owner"] if details else "Unknown Address", 
                "document_type": details["docType"] if details else "Unknown",
                "username": username
            }
        
        return {"status": "Fake / Not Verified", "hash_value": hash_value}
    finally:
        # Clean up temp verification file
        if os.path.exists(file_location):
            os.remove(file_location)

@router.get("/")
def get_documents(current_user: dict = Depends(get_current_user)):
    db = get_db()
    if current_user["role"] == "User":
        try:
            user_oid = ObjectId(current_user["id"])
        except:
            user_oid = current_user["id"]
        docs = list(db.documents.find({"user_id": user_oid, "status": "Approved"}))
    else:
        # Admin or Super Admin can see all
        docs = list(db.documents.find())
        
    # Serialize ObjectId to string and enrich username dynamically
    for d in docs:
        d["_id"] = str(d["_id"])
        
        # Attach username by referencing user table
        if "user_id" in d:
            uid = d["user_id"]
            d["user_id"] = str(uid)
            try:
                user_oid = ObjectId(uid) if isinstance(uid, str) else uid
                user_obj = db.users.find_one({"_id": user_oid})
                if user_obj:
                    d["username"] = user_obj.get("username", "Unknown User")
            except:
                d["username"] = "Unknown User"
                
    return docs

from fastapi.responses import FileResponse
@router.get("/{id}/download")
def download_document(id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    doc = db.documents.find_one({"_id": ObjectId(id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Enforce access correctly
    if current_user["role"] == "User" and str(doc.get("user_id", "")) != str(current_user["id"]) and str(doc.get("owner_id", "")) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Not authorized to download this file")
        
    file_path = doc.get("file_url") or doc.get("file_path")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File lost or unreadable from storage")
        
    return FileResponse(path=file_path, filename=doc.get("original_filename", "document"), media_type='application/octet-stream')

