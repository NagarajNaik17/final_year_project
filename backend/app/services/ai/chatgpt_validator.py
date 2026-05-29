import base64
import json
import os
from openai import OpenAI

API_KEY = os.getenv("OPENAI_API_KEY", "")
client = OpenAI(api_key=API_KEY) if API_KEY else None

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def analyze_document_with_chatgpt(file_path: str, doc_type: str = "Unknown", expected_name: str = ""):
    print(f"[ChatGPT] Starting direct GPT-4o Vision analysis for {file_path}")

    if not API_KEY or client is None:
        return {
            "ocr_score": 0.0,
            "ai_score": 0.0,
            "ml_score": 0.0,
            "feedback": "Missing OpenAI API key. Please set OPENAI_API_KEY in backend/.env."
        }

    base64_image = encode_image(file_path)

    prompt = f"""
    You are an expert document verification AI. Analyze the provided image of a document directly.
    The expected document type is '{doc_type}'.
    The expected name on the document is '{expected_name}'.

    Assess the document for:
    1. Text clarity and readability (OCR quality estimation).
    2. Data correctness and match with expected values.
    3. Visual integrity (tampering, fake features, correct template).

    Provide your response in strictly valid JSON format with the following keys:
    - ocr_score: Float (0-20) representing text clarity.
    - ai_score: Float (0-50) representing data correctness and match.
    - ml_score: Float (0-30) representing visual integrity (tampering check).
    - feedback: String explaining the analysis and reasons for the scores.

    Do not include markdown blocks like ```json ... ```, just return the raw JSON string.
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=600
        )
        content = response.choices[0].message.content.strip()
        
        # sometimes API returns ```json ... ```
        if content.startswith("```json"):
            content = content.replace("```json", "", 1).replace("```", "").strip()
        elif content.startswith("```"):
            content = content.replace("```", "", 1).replace("```", "").strip()

        data = json.loads(content)
        
        return {
            "ocr_score": float(data.get("ocr_score", 0.0)),
            "ai_score": float(data.get("ai_score", 0.0)),
            "ml_score": float(data.get("ml_score", 0.0)),
            "feedback": data.get("feedback", "No feedback provided by AI.")
        }

    except Exception as e:
        print(f"[ChatGPT] Error during analysis: {e}")
        return {
            "ocr_score": 0.0,
            "ai_score": 0.0,
            "ml_score": 0.0,
            "feedback": f"Error communicating with ChatGPT API: {e}"
        }
