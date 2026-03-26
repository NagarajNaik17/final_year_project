from pydantic import BaseModel, Field
from typing import Optional, Dict
from datetime import datetime, timezone

class VerificationScores(BaseModel):
    yolo_score: float = 0.0      # Unused currently
    ocr_score: float = 0.0       # 30% weight
    gemini_score: float = 0.0    # 50% weight
    total_score: float = 0.0

class DocumentSchema(BaseModel):
    owner_id: str
    document_type: str = Field(..., description="Aadhaar | PAN | Voter ID")
    file_path: str
    original_filename: str
    hash_value: str
    
    verification_scores: VerificationScores = VerificationScores()
    
    status: str = Field(default="Pending", description="Pending | Approved | Rejected | Manual Review")
    blockchain_tx_hash: Optional[str] = None
    
    extracted_data: Optional[Dict] = None
    ai_feedback: Optional[str] = None
    
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processed_at: Optional[datetime] = None
