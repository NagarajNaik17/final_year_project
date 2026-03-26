from app.services.ai.ocr_extractor import extract_text
from app.services.ai.gemini_validator import validate_document_with_gemini
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
    print("[OCR] Handing off to extraction module...")
    # 1. OCR Extraction (30%)
    ocr_result = extract_text(file_path, expected_name)
    extracted_text = ocr_result.get("raw_text", "")
    ocr_score = ocr_result.get("ocr_score", 0.0)
    print(f"[OCR] Complete! Read {len(extracted_text)} characters. Extracted Score: {ocr_score}/30")
    
    print("[GEMINI] Booting Visual Forensics pipeline...")
    # 2. Gemini Validation (50%)
    gemini_result = validate_document_with_gemini(extracted_text, doc_type, file_path)
    gemini_score = gemini_result.get("gemini_score", 0.0)
    ai_feedback = gemini_result.get("feedback", "")
    print(f"[GEMINI] Core processing complete. Score: {gemini_score}/50")
    
    total_score = ocr_score + gemini_score
    print(f"[PIPELINE DECISION] Formulated Combined Score: {total_score}/80")
    
    # Decision Logic (Pass if > 50 out of 80)
    if total_score > 50.0:
        status = "Pending Blockchain"
    else:
        status = "Pending"
        
    hash_value = calculate_sha256(file_path)
        
    return {
        "doc_type": doc_type,
        "ocr_score": float(ocr_score),
        "ai_score": float(gemini_score),
        "total_score": float(total_score),
        "ai_feedback": ai_feedback,
        "status": status,
        "hash_value": hash_value,
        "created_at": datetime.now(timezone.utc)
    }
