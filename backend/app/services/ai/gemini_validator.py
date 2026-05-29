import os
import json
import google.generativeai as genai
from PIL import Image

def validate_document_with_gemini(extracted_text: str, document_type: str, file_path: str = None) -> dict:
    """
    Validates the document visually and logically using Google's Gemini Vision API.
    """
    print("[AI ENGINE] Invoking Gemini Multimodal Vision API as primary Visual Forensics layer...")
    if not file_path or not os.path.exists(file_path):
        return {"is_valid": False, "gemini_score": 0.0, "feedback": "File missing for visual validation."}
        
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        print("[GEMINI] Warning: GEMINI_API_KEY is not set.")
        return {"is_valid": False, "gemini_score": 0.0, "feedback": "Missing Gemini API Key. Please set GEMINI_API_KEY in .env."}
        
    try:
        genai.configure(api_key=api_key)
        
        # Use gemini-1.5-flash to avoid v1beta deprecation issues affecting standard pro models
        model = genai.GenerativeModel('gemini-1.5-flash', generation_config={"response_mime_type": "application/json"})
        
        image = Image.open(file_path)
        
        prompt = f"""
        You are a highly capable Document verification AI.
        Analyze the provided image of a document. 
        The expected document type is '{document_type}'.
        The text extracted via OCR from this document is: "{extracted_text}"
        
        Look at the image carefully and output a JSON object with the following schema:
        {{
            "is_valid": boolean, // true if it looks like a genuine {document_type}, false if tampered, fake, or a totally different document type
            "score": number, // a confidence score out of 50. Provide 50 for perfectly genuine, 0 for obviously fake/tampered.
            "feedback": string // explanation of your findings, mentioning any signs of physical tampering, mismatched text, or inconsistencies.
        }}
        """
        
        response = model.generate_content([prompt, image])
        result_text = response.text
        
        data = json.loads(result_text)
        
        score_50 = float(data.get("score", 0.0))
        # ensure it's clamped to 50
        score_50 = max(0.0, min(score_50, 50.0))
        
        is_valid = data.get("is_valid", score_50 >= 25.0)
        feedback = data.get("feedback", "No feedback provided.")
        
        print(f"[GEMINI FINAL] Genuine: {is_valid} -> {score_50:.1f}/50")
        
        return {
            "is_valid": is_valid,
            "gemini_score": score_50,
            "feedback": feedback
        }
        
    except Exception as e:
        import traceback; traceback.print_exc()
        print(f"[CRITICAL GEMINI ERROR] {str(e)}")
        return {"is_valid": False, "gemini_score": 0.0, "feedback": f"Exception: {e}"}
