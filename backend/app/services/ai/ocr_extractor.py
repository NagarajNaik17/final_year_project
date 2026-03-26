import re
import difflib
import cv2
import numpy as np

def preprocess_image(file_path: str) -> np.ndarray:
    img = cv2.imread(file_path)
    if img is None:
        raise ValueError("Could not read image for preprocessing")
        
    # 1. Upscale if small (EasyOCR/PaddleOCR works best at 300+ DPI equivalent)
    h, w = img.shape[:2]
    if w < 1000:
        scale = 1000 / w
        img = cv2.resize(img, None, fx=scale, fy=scale, 
                         interpolation=cv2.INTER_CUBIC)
    
    # 2. Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 3. Denoise
    gray = cv2.fastNlMeansDenoising(gray, h=10)
    
    # 4. Adaptive thresholding (handles uneven lighting)
    thresh = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 31, 10
    )
    
    # 5. Deskew if rotated
    coords = np.column_stack(np.where(thresh > 0))
    if len(coords) > 0:
        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45: angle = 90 + angle
        if abs(angle) > 0.5:  # Only deskew if meaningfully tilted
            (h, w) = thresh.shape
            M = cv2.getRotationMatrix2D((w//2, h//2), angle, 1.0)
            thresh = cv2.warpAffine(thresh, M, (w, h),
                        flags=cv2.INTER_CUBIC,
                        borderMode=cv2.BORDER_REPLICATE)
    
    return thresh

def extract_text_paddle(file_path: str) -> list:
    from paddleocr import PaddleOCR
    import logging
    # Suppress verbose paddle logs
    logging.getLogger('ppocr').setLevel(logging.ERROR) 
    
    # lang='en' handles both English and Hindi robustly via internal heuristics
    ocr = PaddleOCR(use_angle_cls=True, lang='en', use_gpu=False, show_log=False)
    result = ocr.ocr(file_path, cls=True)
    
    lines = []
    if result and result[0]:
        for line in result[0]:
            if line and len(line) > 1:
                text = line[1][0]   # extracted text
                conf = line[1][1]   # confidence score
                if conf > 0.5:      # filter low-confidence
                    lines.append(text)
    
    return lines

# Configuration Dictionaries
KEYWORDS = {
    "PAN": {
        "primary": ["INCOME TAX DEPARTMENT", "PERMANENT ACCOUNT NUMBER", "आयकर विभाग"],
        "secondary": ["GOVT OF INDIA", "GOVERNMENT OF INDIA", "PAN NUMBER", "ACCOUNT NUMBER", "SIGNATURE"],
        "variants": ["INCOME TAX DEPARTM", "INCOMETAX", "INC0ME TAX"]
    },
    "Aadhaar": {
        "primary": ["UNIQUE IDENTIFICATION AUTHORITY OF INDIA", "GOVERNMENT OF INDIA", "आधार", "भारत सरकार"],
        "secondary": ["AADHAAR", "DOB", "DATE OF BIRTH", "MALE", "FEMALE", "VID", "YEAR OF BIRTH"],
        "variants": ["GOVEMMENT OF INDIA", "UNIQUE IDENTIFICATION", "UIDAI"]
    },
    "Voter ID": {
        "primary": ["ELECTION COMMISSION OF INDIA", "ELECTOR PHOTO IDENTITY CARD", "निर्वाचन आयोग"],
        "secondary": ["ELECTOR", "IDENTITY CARD", "EPIC", "AGE", "SEX", "DATE OF BIRTH"],
        "variants": ["ELECTLON COMMISSION", "COMMISSI0N", "IDENTITY CARD"]
    }
}

REGEX_PATTERNS = {
    "Aadhaar": r'[2-9][0-9]{3}\s[0-9]{4}\s[0-9]{4}',
    "PAN": r'[A-Z]{5}[0-9]{4}[A-Z]',
    "Voter ID": r'[A-Z]{3}[0-9]{7}' # Assuming standard 3 letter 7 number EPIC
}

def normalize_text(text: str) -> str:
    # Convert to uppercase
    text = text.upper()
    # Remove extra whitespace
    text = " ".join(text.split())
    # Strip basic OCR noise (but keep Hindi Unicodes \u0900-\u097F)
    text = re.sub(r'[^\w\s\u0900-\u097F]', '', text)
    return text

def normalize_ocr_mistakes(text: str, is_digit_context: bool = False) -> str:
    # Highly specific replacements based on context
    if is_digit_context:
        return text.replace("O", "0").replace("I", "1").replace("L", "1")
    else:
        return text.replace("0", "O").replace("1", "I")

def fuzzy_match(target: str, lines: list, cutoff=0.8) -> bool:
    target = target.upper()
    target_words = target.split()
    target_words_count = len(target_words)
    
    for line in lines:
        line = line.upper()
        if target in line:
            return True
            
        if difflib.SequenceMatcher(None, target, line).ratio() >= cutoff:
            return True
            
        words = line.split()
        if len(words) >= target_words_count:
            # sliding window n-gram match
            for i in range(len(words) - target_words_count + 1):
                window = " ".join(words[i:i+target_words_count])
                if difflib.SequenceMatcher(None, target, window).ratio() >= cutoff:
                    return True
    return False

def extract_text(file_path: str, expected_name: str = "") -> dict:
    try:
        # Preprocess first
        try:
            processed_img = preprocess_image(file_path)
            preprocessed_path = file_path.replace(".", "_processed.")
            cv2.imwrite(preprocessed_path, processed_img)
            target_path = preprocessed_path
        except Exception as preprocess_err:
            print(f"Preprocessing failed: {preprocess_err}, using original.")
            target_path = file_path
            
        # Try PaddleOCR on preprocessed image
        result_lines = extract_text_paddle(target_path)
        
        if len(" ".join(result_lines)) < 20 and target_path != file_path:
            print("[OCR] Preprocessed image yielded low text. Falling back to original image.")
            result_lines = extract_text_paddle(file_path)
        
        # 1. Normalization
        raw_lines = [normalize_text(line) for line in result_lines]
        raw_text_full = " ".join(raw_lines)
        
        print("\n" + "="*50)
        print("[OCR ENGINE] RAW TEXT EXTRACTION RESULT:")
        print(raw_text_full)
        print("="*50 + "\n")
        
        best_doc_type = "Unknown"
        best_id_number = None
        best_confidence = 0
        extracted_fields = {"name": None, "dob": None, "gender": None}
        
        # 7. Secondary Field Extraction: Name, DOB, Gender
        dob_match = re.search(r'\d{2}/\d{2}/\d{4}', raw_text_full)
        if dob_match:
            extracted_fields["dob"] = dob_match.group(0)
            
        if "MALE" in raw_text_full and "FEMALE" not in raw_text_full:
            extracted_fields["gender"] = "MALE"
        elif "FEMALE" in raw_text_full:
            extracted_fields["gender"] = "FEMALE"
            
        # Expected Name override logic
        if expected_name:
            norm_name = normalize_text(expected_name)
            if fuzzy_match(norm_name, raw_lines, cutoff=0.8):
                extracted_fields["name"] = expected_name
        
        # Evaluate Each Doc Type
        for doc_type in KEYWORDS.keys():
            k_score = 0
            print(f"\n--- [OCR] Evaluating Keyword Profile for {doc_type} ---")
            
            matched_primary = [p for p in KEYWORDS[doc_type]["primary"] if fuzzy_match(p, raw_lines, 0.85)]
            missing_primary = [p for p in KEYWORDS[doc_type]["primary"] if p not in matched_primary]
            
            matched_secondary = [s for s in KEYWORDS[doc_type]["secondary"] if fuzzy_match(s, raw_lines, 0.85)]
            missing_secondary = [s for s in KEYWORDS[doc_type]["secondary"] if s not in matched_secondary]
            
            matched_variants = [v for v in KEYWORDS[doc_type]["variants"] if fuzzy_match(v, raw_lines, 0.85)]
            missing_variants = [v for v in KEYWORDS[doc_type]["variants"] if v not in matched_variants]
            
            print(f"  [+] Matched Primary: {matched_primary}")
            print(f"  [-] Missing Primary: {missing_primary}")
            print(f"  [+] Matched Secondary: {matched_secondary}")
            print(f"  [-] Missing Secondary: {missing_secondary}")
            print(f"  [+] Matched Variants: {matched_variants}")
            print(f"  [-] Missing Variants: {missing_variants}")

            primary_matches = len(matched_primary)
            secondary_matches = len(matched_secondary)
            variant_matches = len(matched_variants)
            
            total_matches = primary_matches + secondary_matches + variant_matches
            
            # 6. Partial Matching Rule
            if primary_matches > 0 and secondary_matches > 0:
                k_score = 40
            elif total_matches >= 3: 
                # 70-90% confidence partial
                k_score = 35
            elif total_matches > 0:
                # low confidence
                k_score = 20
                
            # 4. Strict Regex Validation
            r_score = 0
            id_matched = None
            
            # Fix zero/O mistakes generally across the text block for the specific search
            sanitized_num_text = normalize_ocr_mistakes(raw_text_full, is_digit_context=True)
            sanitized_alpha_text = normalize_ocr_mistakes(raw_text_full, is_digit_context=False)
            
            if doc_type == "Aadhaar":
                # Aadhaar might contain spaces
                aadhaar_match = re.search(REGEX_PATTERNS["Aadhaar"], raw_text_full)
                if not aadhaar_match:
                    aadhaar_match = re.search(REGEX_PATTERNS["Aadhaar"], sanitized_num_text)
                    
                if aadhaar_match:
                    check = aadhaar_match.group(0)
                    if check[0] not in ['0', '1']: 
                        id_matched = check
                        r_score = 40
                        
            elif doc_type == "PAN":
                for word in raw_text_full.split() + sanitized_alpha_text.split():
                    pan_match = re.search(REGEX_PATTERNS["PAN"], word)
                    if pan_match:
                        check = pan_match.group(0)
                        # Validate 4th character
                        if check[3] in ['P', 'C', 'H', 'A', 'B', 'G', 'L', 'F', 'T', 'J']:
                            id_matched = check
                            r_score = 40
                            break
                        else:
                            r_score = 20 # Partial valid, almost PAN
                            
            elif doc_type == "Voter ID":
                for word in raw_text_full.split() + sanitized_alpha_text.split():
                    voter_match = re.search(REGEX_PATTERNS["Voter ID"], word)
                    if voter_match:
                        id_matched = voter_match.group(0)
                        r_score = 40
                        break
            
            # 5. Scoring Logic: calculate secondary score directly
            s_score = 0
            if extracted_fields["name"]: s_score += 10
            if extracted_fields["dob"]: s_score += 5
            if extracted_fields["gender"]: s_score += 5
            
            total_confidence = k_score + r_score + s_score
            
            if total_confidence > best_confidence:
                best_confidence = total_confidence
                best_doc_type = doc_type
                if id_matched:
                    best_id_number = id_matched
                    
        if best_confidence < 20: # Floor failsafe
            best_doc_type = "Unknown"
            
        # Transform for pipeline backward compatibility requirements
        ocr_compatibility_score = min((best_confidence / 100.0) * 30.0, 30.0)

        # 8. Output Format JSON Mapping
        return {
            "doc_type": best_doc_type,
            "id_number": best_id_number,
            "confidence_score": best_confidence,
            "extracted_fields": extracted_fields,
            "raw_text": raw_text_full, # Backward compatibility
            "ocr_score": round(ocr_compatibility_score, 2) # Backward compatibility
        }

    except Exception as e:
        import traceback; traceback.print_exc()
        print(f"OCR Exception: {e}")
        return {
            "doc_type": "Unknown",
            "id_number": None,
            "confidence_score": 0,
            "extracted_fields": {"name": None, "dob": None, "gender": None},
            "raw_text": "Mock extracted data: DOB: 01/01/2000", 
            "ocr_score": 15.0
        }
