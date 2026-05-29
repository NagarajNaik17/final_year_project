from app.services.ai.ocr_extractor import extract_text
from app.services.ai.yolo_detector import detect_document_type
import hashlib
from datetime import datetime, timezone

def calculate_sha256(file_path: str) -> str:
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def process_document(file_path: str, doc_type: str = "Unknown", expected_name: str = ""):
    print(f"\n[PIPELINE START] Processing local buffer: {file_path}")
    
    # 1. OCR Extraction (30%)
    print("[OCR] Handing off to extraction module...")
    ocr_result = extract_text(file_path, expected_name)
    extracted_text = ocr_result.get("raw_text", "")
    ocr_score = ocr_result.get("ocr_score", 0.0)
    print(f"[OCR] Complete! Read {len(extracted_text)} characters. Extracted Score: {ocr_score}/30")
    
    # 2. AI Score omitted per user request
    ai_score = 0.0
    ai_feedback = "AI validation has been deactivated in favor of local heuristics."
    
    # 3. YOLO ML Model Validation (70%)
    print("[YOLO] Booting ML Model Verification pipeline...")
    yolo_result = detect_document_type(file_path, doc_type)
    ml_score = yolo_result.get("yolo_score_out_of_70", 0.0)
    print(f"[YOLO] Core processing complete. Score: {ml_score}/70")
    
    total_score = ocr_score + ml_score
    print(f"[PIPELINE DECISION] Formulated Combined Score: {total_score}/100")
    
    # Decision Logic (Pass if > 60 out of 100)
    if total_score > 60.0:
        status = "Pending Blockchain"
    else:
        status = "Pending"
        
    hash_value = calculate_sha256(file_path)
        
    return {
        "doc_type": doc_type,
        "ocr_score": float(ocr_score),
        "ai_score": float(ai_score),
        "ml_score": float(ml_score),
        "total_score": float(total_score),
        "ai_feedback": ai_feedback,
        "status": status,
        "hash_value": hash_value,
        "created_at": datetime.now(timezone.utc)
    }
