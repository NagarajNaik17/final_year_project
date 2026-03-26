from pydantic import BaseModel, EmailStr, Field
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
