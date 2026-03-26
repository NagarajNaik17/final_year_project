from fastapi import APIRouter, HTTPException, Depends, status
from app.database import get_db
from app.models.user import UserSchema, UserLogin, UserCreateAdmin, UserCreateUser
from app.auth_utils import get_password_hash, verify_password, create_access_token
from datetime import datetime, timezone
import uuid

router = APIRouter()

@router.post("/login")
def login(user: UserLogin):
    db = get_db()
    db_user = db.users.find_one({"$or": [{"username": user.username_or_email}, {"email": user.username_or_email}]})
    
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username/email or password")
    
    access_token = create_access_token(data={"sub": db_user["username"], "role": db_user["role"], "id": str(db_user["_id"])})
    return {"access_token": access_token, "token_type": "bearer", "role": db_user["role"], "username": db_user["username"]}

@router.post("/register/user")
def register_user(user: UserCreateUser):
    db = get_db()
    
    if db.users.find_one({"username": user.username}):
        raise HTTPException(status_code=400, detail="Username already registered")
    
    if db.users.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = {
        "username": user.username,
        "email": user.email,
        "password": get_password_hash(user.password),
        "role": "User",
        "aadhaar_number": user.aadhaar_number,
        "created_at": datetime.now(timezone.utc)
    }
    
    db.users.insert_one(new_user)
    return {"message": "User registered successfully"}


@router.post("/seed-superadmin")
def seed_superadmin():
    db = get_db()
    if db.users.find_one({"role": "Super Admin"}):
        raise HTTPException(status_code=400, detail="Super Admin already exists")
    
    superadmin = {
        "username": "superadmin",
        "email": "superadmin@system.local",
        "password": get_password_hash("superadmin123"),
        "role": "Super Admin",
        "created_at": datetime.now(timezone.utc)
    }
    db.users.insert_one(superadmin)
    return {"message": "Super Admin seeded successfully"}
