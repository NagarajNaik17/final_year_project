from ultralytics import YOLO

def detect_document_type(file_path: str, doc_type: str = "Unknown") -> dict:
    """
    Detects if the document is a valid Photo ID using a YOLOv8 classification model.
    Dynamically routes to the Aadhaar or PAN model.
    """
    try:
        if doc_type == "aadhaar":
            model_path = r"c:\Users\nagar\OneDrive\Desktop\final_year_project\model\runs\aadhar_fake_real_cls\weights\best.pt"
        elif doc_type == "pan":
            model_path = r"c:\Users\nagar\OneDrive\Desktop\final_year_project\model\runs\pan_fake_real_cls\weights\best.pt"
        else:
            print(f"[ML YOLO] Error: Unsupported doc_type '{doc_type}'")
            return {"type": "Unknown (Invalid)", "confidence": 0.0, "yolo_score_out_of_70": 0.0}

        model = YOLO(model_path)
        results = model(file_path)
        
        real_prob = 0.0
        for r in results:
            probs = r.probs
            for k, v in r.names.items():
                if v.lower() == "real":
                    real_prob = probs.data[k].item()
                    break

        yolo_score = real_prob * 70.0
        print(f"[ML YOLO] Detected as '{doc_type}'. P(Real) = {real_prob:.4f}. ML Score = {yolo_score:.2f}/70")
        
        return {
            "type": f"{doc_type.capitalize()} (YOLO)",
            "confidence": real_prob,
            "yolo_score_out_of_70": yolo_score
        }
            
    except Exception as e:
        print(f"[ML YOLO] Execution Warning: {e}")
        return {"type": "Unknown", "confidence": 0.0, "yolo_score_out_of_70": 0.0}
