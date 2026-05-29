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

def build_user_queries(user_id):
    queries = [{"user_id": user_id}]
    if isinstance(user_id, ObjectId):
        queries.append({"user_id": str(user_id)})
    return queries

def get_latest_user_document_query(user_id, doc_type):
    return {
        "$and": [
            {"$or": build_user_queries(user_id)},
            {"doc_type": doc_type}
        ]
    }

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
            target_user_id = user_id

        # 1. Run AI Pipeline
        print(f"[SYSTEM] Local file locked -> {file_location}. Executing verification core... Expected Name: {expected_name}")
        result = process_document(file_location, doc_type, expected_name)
        print(f"[SYSTEM] Pipeline detached logic perfectly!")
        
        # 2. Prepare version metadata before any approval / duplicate branch
        print("[DATABASE] Preparing version metadata for the uploaded document...")
        document_data = result
        try:
            document_data["user_id"] = ObjectId(user_id)
        except:
            document_data["user_id"] = user_id

        latest_existing_doc = db.documents.find_one(
            get_latest_user_document_query(document_data["user_id"], doc_type),
            sort=[("version", -1), ("created_at", -1), ("_id", -1)]
        )
        next_version = (latest_existing_doc.get("version", 0) + 1) if latest_existing_doc else 1

        db.documents.update_many(
            get_latest_user_document_query(document_data["user_id"], doc_type),
            {"$set": {"is_latest": False}}
        )

        document_data["owner_id"] = str(current_user["id"])
        document_data["file_url"] = file_location
        document_data["original_filename"] = file.filename
        document_data["version"] = next_version
        document_data["is_latest"] = True

        # 3. Check if hash exists on Blockchain or local DB (Only if score >= 50)
        print(f"[SYSTEM] Evaluation branch logic loaded. Duplication filter: {'ACTIVE' if result.get('total_score', 0) >= 50.0 else 'SKIPPED (Score < 50)'}")

        exists_on_chain = False
        existing_doc = None
        if result.get("total_score", 0) >= 50.0:
            exists_on_chain = check_document_exists_on_blockchain(result["hash_value"])
            existing_doc = db.documents.find_one({"hash_value": result["hash_value"]})

        # 4. Save to MongoDB
        print("[DATABASE] Securing completely new Document into MongoDB ledger...")
        inserted = db.documents.insert_one(document_data)
        print(f"[DATABASE] Saved successfully! Native Mongodb ID -> {inserted.inserted_id}")

        # If score >= 50, proceed to blockchain automatically unless this is a known duplicate
        blockchain_status = "Not Stored"
        transaction_hash = None
        requires_wallet_approval = False

        if exists_on_chain or existing_doc:
            print("[SYSTEM NOTICE] Matching document hash already exists. Saving as a new version and reusing existing verification state.")
            transaction_hash = (existing_doc or {}).get("blockchain_tx_hash")
            blockchain_status = "Duplicate"

            if exists_on_chain or transaction_hash:
                document_data["status"] = "Approved"
                document_data["blockchain_tx_hash"] = transaction_hash
                db.documents.update_one(
                    {"_id": inserted.inserted_id},
                    {"$set": {"status": "Approved", "blockchain_tx_hash": transaction_hash, "duplicate_of_hash": result["hash_value"]}}
                )
            else:
                document_data["status"] = "Pending"
                db.documents.update_one(
                    {"_id": inserted.inserted_id},
                    {"$set": {"status": "Pending", "duplicate_of_hash": result["hash_value"]}}
                )
        elif document_data["status"] == "Pending Blockchain":
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
            requires_wallet_approval = True
            
        document_data["_id"] = str(inserted.inserted_id)
        if "user_id" in document_data:
            document_data["user_id"] = str(document_data["user_id"])
            
        data_res = {
            "ocr_score": document_data.get("ocr_score", 0),
            "ai_score": document_data.get("ai_score", 0),
            "ml_score": document_data.get("ml_score", 0),
            "total_score": document_data.get("total_score", 0),
            "status": "approved" if document_data["status"] == "Approved" else "pending",
            "blockchain_status": blockchain_status,
            "transaction_hash": transaction_hash,
            "doc_type": document_data.get("doc_type"),
            "hash_value": document_data.get("hash_value"),
            "version": document_data.get("version", 1),
            "doc_id": document_data.get("_id"),
            "requires_wallet_approval": requires_wallet_approval
        }
            
        print("[ROUTE COMPLETION] Upload cycle formally completed and returned natively!")
        print("="*50)
        return {"success": True, "message": "Verification completed", "data": data_res}
        
    except HTTPException:
        raise
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

        docs = list(
            db.documents.find(
                {
                    "$and": [
                        {"$or": build_user_queries(user_oid)},
                        {"is_latest": True}
                    ]
                }
            ).sort([("created_at", -1), ("version", -1), ("_id", -1)])
        )

        # Backward-compatible fallback for older records that do not yet have is_latest.
        if not docs:
            raw_docs = list(
                db.documents.find(
                    {"$or": build_user_queries(user_oid)}
                ).sort([("created_at", -1), ("version", -1), ("_id", -1)])
            )

            latest_by_type = {}
            for doc in raw_docs:
                doc_type = doc.get("doc_type", doc.get("document_type", "Unknown"))
                if doc_type not in latest_by_type:
                    latest_by_type[doc_type] = doc
            docs = list(latest_by_type.values())
    else:
        # Admin or Super Admin can see all
        docs = list(db.documents.find().sort([("created_at", -1), ("_id", -1)]))
        
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
