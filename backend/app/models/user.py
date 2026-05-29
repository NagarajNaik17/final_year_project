from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime, timezone

class UserSchema(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = Field(default="User", description="Super Admin | Admin | User")
    aadhaar_number: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserLogin(BaseModel):
    username_or_email: str
    password: str

class UserCreateAdmin(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserCreateUser(BaseModel):
    username: str
    email: EmailStr
    password: str
    aadhaar_number: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()

    @field_validator("aadhaar_number")
    @classmethod
    def validate_aadhaar_number(cls, value: str) -> str:
        aadhaar_number = value.strip()
        if not aadhaar_number.isdigit() or len(aadhaar_number) != 12:
            raise ValueError("Aadhaar number must be exactly 12 digits")
        return aadhaar_number
