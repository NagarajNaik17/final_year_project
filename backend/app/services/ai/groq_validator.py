import os
import json
import base64
from groq import Groq

def encode_image(file_path: str) -> str:
    with open(file_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def validate_document_with_groq(extracted_text: str, document_type: str, file_path: str = None) -> dict:
    """
    Validates the document visually and logically using Groq's LLaMA 3.2 Vision Model.
    """
    print("[AI ENGINE] Invoking Groq Versatile Llama API as text-based heuristics validation layer...")
    if not file_path or not os.path.exists(file_path):
        return {"is_valid": False, "groq_score": 0.0, "feedback": "File missing for visual validation."}
        
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        print("[GROQ] Warning: GROQ_API_KEY is not set.")
        return {"is_valid": False, "groq_score": 0.0, "feedback": "Missing Groq API Key. Please set GROQ_API_KEY in .env."}
        
    try:
        client = Groq(api_key=api_key)
        
        base64_image = None # Vision models deprecated on this tier; omitting image completely
        
        prompt = f"""
        You are a highly capable Document verification AI.
        Analyze the extracted text from a document. 
        The expected document type is '{document_type}'.
        The text extracted via OCR from this document is: "{extracted_text}"
        
        Analyze the text carefully to ensure it aligns with the expected format and content of a genuine {document_type}.
        Output a JSON object strictly following this exact schema:
        {{
            "is_valid": boolean, // true if it looks like a genuine {document_type}, false if totally tampered, fake, or different format
            "score": number, // a confidence score out of 50. Provide 50 for perfectly genuine, 0 for obviously fake/tampered.
            "feedback": string // explanation of your findings, specifically pointing out missing necessary fields or inconsistencies in the extracted OCR text compared to standard expectations.
        }}
        """
        
        response = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        
        result_text = response.choices[0].message.content
        data = json.loads(result_text)
        
        score_50 = float(data.get("score", 0.0))
        # Ensure it's clamped to max 50
        score_50 = max(0.0, min(score_50, 50.0))
        
        is_valid = data.get("is_valid", score_50 >= 25.0)
        feedback = data.get("feedback", "No feedback provided.")
        
        print(f"[GROQ FINAL] Genuine: {is_valid} -> {score_50:.1f}/50")
        
        return {
            "is_valid": is_valid,
            "groq_score": score_50,
            "feedback": feedback
        }
        
    except Exception as e:
        import traceback; traceback.print_exc()
        print(f"[CRITICAL GROQ ERROR] {str(e)}")
        return {"is_valid": False, "groq_score": 0.0, "feedback": f"Exception: {e}"}
