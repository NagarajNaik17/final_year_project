from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.auth import router as auth_router
from app.api.document import router as document_router
from app.api.superadmin import router as superadmin_router
from app.api.admin import router as admin_router

app = FastAPI(title="Document Verification and Blockchain Storage API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
app.include_router(document_router, prefix="/api/documents", tags=["Documents"])
app.include_router(superadmin_router, prefix="/api/superadmin", tags=["Super Admin"])

@app.get("/")
def read_root():
    return {"message": "Document Verification API is running"}
