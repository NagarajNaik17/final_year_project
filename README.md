# 🛡️ Blockchain based digital wallet and document verification
## 📌 Overview

This project is a **Document Verification and Fraud Detection Platform** built to validate uploaded identity or official documents using a combination of:

* 📄 OCR (Optical Character Recognition)
* 🤖 Machine Learning
* 👥 Role-Based Review System
* ⛓️ Blockchain-Based Proof Storage

The primary goal of the system is to reduce fake document submissions by:

* 🔍 Extracting readable text from uploaded documents
* 🧠 Identifying document type using a trained ML model
* 📊 Calculating a verification score
* ✅ Allowing authorized reviewers to approve or reject documents
* ⛓️ Storing approved document hashes on blockchain
* 🌐 Enabling public verification without exposing the original document

This project is designed for both **academic demonstration** and **real-world applications** such as e-Governance, Recruitment, Admissions, KYC, and Secure Record Verification.

---

# 🚀 What This Project Does

The platform provides a complete end-to-end document verification workflow:

### 1️⃣ Document Upload

Users upload a document through the frontend dashboard.

### 2️⃣ OCR Processing

The backend extracts text from the uploaded document.

### 3️⃣ Document Detection

A YOLO-based model identifies the document type.

### 4️⃣ Verification Scoring

OCR and ML scores are combined into a verification score out of 100.

### 5️⃣ Human Review

Admins review verification results and approve/reject documents.

### 6️⃣ Blockchain Registration

Approved documents can be anchored to Ethereum blockchain through MetaMask.

### 7️⃣ Public Verification

Anyone can verify authenticity using the public verification portal.

---

# ⚙️ How It Works

## 👤 1. Role-Based Access Control

The platform supports three user roles:

* 👤 User
* 🛡️ Admin
* 👑 Super Admin

Each role has access only to the features assigned to it.

---

## 📄 2. OCR Extraction

Uploaded documents are processed using OCR to extract readable text and assess content quality.

**Technology Used:**

* PaddleOCR

---

## 🤖 3. Document Type Detection

A YOLO-based detection pipeline identifies the type of uploaded document.

**Examples:**

* Aadhaar Card
* PAN Card
* Certificates
* Identity Documents

---

## 📊 4. Verification Pipeline

The verification score is generated using:

| Component            | Contribution |
| -------------------- | ------------ |
| OCR Score            | 📄           |
| YOLO Detection Score | 🤖           |

These scores are combined into a **100-point verification system**.

Based on the score:

* 🟢 High Score → Blockchain Ready
* 🟡 Medium Score → Manual Review
* 🔴 Low Score → Rejected

---

## ⛓️ 5. Blockchain Anchoring

For approved documents:

1. SHA-256 hash is generated.
2. Hash is stored on Ethereum Sepolia.
3. Smart contract records immutable proof.

### Benefits

* 🔒 Original document remains private
* 🛡️ Tamper-resistant verification
* 📜 Immutable audit trail
* 🌐 Public authenticity verification

---

## 🌍 6. Public Verification

Users can verify a document by:

* Uploading the document
* Providing the document hash

The system compares the generated hash with the blockchain record.

---

# 💡 Why This Project Is Helpful

### ✅ Reduces Manual Verification Effort

Automates large parts of document screening.

### 🛡️ Detects Fraudulent Documents

Uses OCR and ML scoring to identify suspicious uploads.

### 🔍 Improves Transparency

Verification actions can be audited.

### ⛓️ Provides Blockchain Trust

Approved documents gain immutable proof of authenticity.

### 🌐 Enables Public Verification

Verification can occur without exposing sensitive document content.

---

# 🎯 Use Cases

This platform can be used in:

🎓 Colleges & Universities

💼 HR & Recruitment Systems

🏦 FinTech & KYC Platforms

🏛️ Government Verification Departments

📜 Certificate Verification Systems

🏥 Healthcare Record Validation

---

# 🛠️ Tech Stack

## 🎨 Frontend

* React
* Vite
* React Router
* Axios
* Tailwind CSS
* React Hot Toast
* Ethers.js
* Lucide React

---

## ⚡ Backend

* FastAPI
* Uvicorn
* PyMongo
* Python Dotenv
* PyJWT
* Pillow

---

## 🤖 AI / ML / OCR

* PaddleOCR
* PaddlePaddle
* Ultralytics YOLO
* Google Gemini AI
* Groq API
* OpenAI API

> ℹ️ Current verification pipeline primarily uses OCR and YOLO scoring.

---

## ⛓️ Blockchain

* Web3.py
* Ethereum Sepolia Testnet
* MetaMask
* Alchemy RPC

---

# ✨ Main Features

✅ Role-Based Authentication

✅ Protected Dashboards

✅ OCR-Based Text Extraction

✅ ML-Based Document Detection

✅ Verification Scoring Pipeline

✅ Blockchain Hash Anchoring

✅ MetaMask Integration

✅ Public Verification Portal

✅ Admin Approval Workflow

✅ User / Admin / Super Admin Dashboards

---

# 📁 Project Structure

```text
final_year_project/
├── backend/
│   ├── app/
│   │   ├── api/                  # FastAPI route handlers
│   │   ├── models/               # Data models / schemas
│   │   ├── services/
│   │   │   ├── ai/               # OCR, AI validation, YOLO logic
│   │   │   ├── blockchain.py     # Blockchain interaction layer
│   │   │   └── verification_service.py
│   │   ├── auth_deps.py          # Auth dependency helpers
│   │   ├── auth_utils.py         # JWT and password helpers
│   │   ├── database.py           # MongoDB connection
│   │   └── main.py               # FastAPI app entry point
│   ├── uploads/                  # Uploaded/generated files
│   ├── requirements.txt          # Python dependencies
│   └── .env                      # Local backend environment variables
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/           # Shared UI and MetaMask components
│   │   ├── context/              # React context providers
│   │   ├── pages/                # Landing, Login, dashboards, verify page
│   │   ├── App.jsx               # App routes
│   │   └── main.jsx              # Frontend entry point
│   ├── package.json
│   └── .env                      # Frontend environment variables
├── model/                        # ML training files / datasets
└── README.md
```

---

# 📋 Prerequisites

Before running the project, install:

* ✅ Node.js & npm
* ✅ Python 3.10+
* ✅ MongoDB Atlas / Local MongoDB
* ✅ MetaMask Extension
* ✅ Alchemy RPC URL
* ✅ Ethereum Test Wallet

---

# 🔐 Environment Variables

## Backend `.env`

```env
MONGO_URI=your_mongodb_connection_string
DATABASE_NAME=doc_verify
SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

GROQ_API_KEY=your_groq_key
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key

ALCHEMY_RPC_URL=your_alchemy_sepolia_rpc_url
CONTRACT_ADDRESS=your_deployed_contract_address
PRIVATE_KEY=your_wallet_private_key

REALITY_DEFENDER_API_KEY=your_reality_defender_key
```

## Frontend `.env`

```env
VITE_CONTRACT_ADDRESS=your_contract_address
```

---

# 🚀 Installation

## 1️⃣ Clone Repository

```bash
git clone https://github.com/NagarajNaik17/final_year_project.git

cd final_year_project
```

---

## 2️⃣ Backend Setup

```bash
cd backend

python -m venv venv
```

### Activate Environment

Windows

```bash
venv\Scripts\activate
```

Linux/macOS

```bash
source venv/bin/activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

---

## 3️⃣ Frontend Setup

```bash
cd frontend

npm install
```

---

# ▶️ Running the Project

## Start Backend

```bash
uvicorn app.main:app --reload
```

Backend URL:

```text
http://127.0.0.1:8000
```

---

## Start Frontend

```bash
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

---

# 🔄 Typical Workflow

1️⃣ Login with appropriate role

2️⃣ Upload document

3️⃣ OCR extracts text

4️⃣ YOLO detects document type

5️⃣ Verification score generated

6️⃣ Admin reviews result

7️⃣ Blockchain hash stored (optional)

8️⃣ Public verification available

---

# 📈 Results

This project successfully demonstrates:

✅ Full-Stack Integration

✅ OCR-Based Document Processing

✅ ML-Based Verification

✅ SHA-256 Document Fingerprinting

✅ Blockchain Proof Storage

✅ Role-Based Verification Workflow

✅ Public Authenticity Verification

### Future Metrics

* 🎯 Verification Accuracy
* 📄 OCR Performance
* ⛓️ Blockchain Transaction Success Rate
* ⚡ Response Time Analysis
* 📊 System Scalability Metrics

---

# 📸 Screenshots

## 🏠 Landing Page

<img width="1864" height="987" alt="image" src="https://github.com/user-attachments/assets/69d76da8-a8c7-40cd-a4ea-27ff2f424d0b" />


## 👤 User Dashboard

<img width="1895" height="977" alt="image" src="https://github.com/user-attachments/assets/bc3e6946-55c1-4407-a228-f126916b18d6" />


## 🛡️ Admin Dashboard

<img width="1852" height="990" alt="image" src="https://github.com/user-attachments/assets/1a8a2fe8-4877-43c2-a6d6-b207df98f59c" />


## 👑 ⛓️ Blockchain / MetaMask Flow

<img width="1862" height="1002" alt="image" src="https://github.com/user-attachments/assets/147486fa-7bec-4836-a95b-4d74098514b2" />


## 🌍 Public Verification Page

<img width="1008" height="975" alt="image" src="https://github.com/user-attachments/assets/bef6e8ce-e8b4-4855-a7b0-81c5f5ff95be" />



---

# 🔮 Future Improvements

* 🤖 Advanced Fraud Detection Models
* 📊 Larger Training Datasets
* 🔐 Enhanced Security Controls
* 📜 Downloadable Verification Reports
* 📝 Audit Logging
* 🌐 Cloud Deployment Pipelines
* 🧪 Unit & Integration Testing
* 📁 Support for More Document Types
* ⚡ Better Public Verification UX

---

# 🎓 Conclusion

This project combines:

* 🤖 Artificial Intelligence
* 📄 OCR Technology
* 🌐 Full-Stack Web Development
* ⛓️ Blockchain Technology

into a practical and scalable document verification solution.

### ⭐ Key Highlights

* Real-world problem solving
* Modern full-stack architecture
* AI/ML integration
* Meaningful blockchain implementation
* Secure and scalable verification workflow

---

## 👨‍💻 Author

### Nagaraj Naik

🎓 Computer Science Engineering Graduate


---

⭐ If you found this project useful, don't forget to star the repository!
❤️Feel free to fork and contribute to this project! Pull requests are welcome. 🎉
