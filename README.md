# 🎓 AARAMBH ASCEND™

An AI-powered decision-support system designed to identify students at risk of dropping out and enable educational institutions to take proactive, early intervention steps.

[![SIH](https://img.shields.io/badge/Smart%20India%20Hackathon-2024%2F2026-blue.svg)](https://sih.gov.in/)
[![SDG 4](https://img.shields.io/badge/SDG%204-Quality%20Education-E5243B.svg)](https://sdgs.un.org/goals/goal4)
[![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20FastAPI-green.svg)](#-tech-stack)

---

## 📌 Problem Statement

Students rarely drop out without warning. They consistently demonstrate subtle behavioral and academic shifts long before making the decision to leave:

* 📉 **Declining Academic Performance:** Gradual drops in quiz and exam grades.
* 💤 **Low Platform Engagement:** Decreased access to LMS materials and lectures.
* ⏰ **Assignment Delays:** Late submissions and missed deadlines.
* 📊 **Inconsistent Activity:** Spiky or decaying interaction patterns over time.

Because these critical signals are fragmented across disconnected institutional systems (LMS, examination portals, registrar records), faculty members often miss them until it is too late. **AARAMBH ASCEND™** aggregates and analyzes these multi-source signals in real time to deliver actionable early warnings.

---

## 🎯 Key Features & Functionality

* **Multi-Source Data Aggregation:** Seamlessly ingests student academic records, assignment histories, and LMS telemetry.
* **Automated Feature Engineering:** Transforms raw interaction logs into ML-ready behavioral indicators.
* **Predictive Risk Scoring:** Uses machine learning models to calculate precise dropout probabilities.
* **Risk Intelligence & History:** Tracks risk trends over time to see if a student is improving or deteriorating.
* **Smart Alerts & Interventions:** Automatically flags vulnerable students and tracks faculty-led intervention outcomes.
* **Human-in-the-Loop Design:** Serves strictly as a decision-support aid for educators rather than an automated grading or disciplinary tool.

---

## 🏗 System Architecture

**AARAMBH ASCEND™** employs a decoupled architecture, separating the core API layer from the dedicated Python ML inference pipeline to ensure scalability and independent model deployment.

```text
┌─────────────────────────────────────────────────────────────────┐
│                        React + Vite UI                          │
└────────────────────────────────┌────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Node.js + Express API                       │
│  (Auth, Business Logic, Raw Parameterized SQL, Feature Builder) │
└──────────────┬──────────────────────────────────┬───────────────┘
               │                                  │
               ▼                                  ▼
┌──────────────────────────────┐  ┌───────────────────────────────┐
│     Neon PostgreSQL DB       │  │      FastAPI ML Service       │
│  (Student Data & Analytics)  │  │   (Model Inference & Schema)  │
└──────────────────────────────┘  └───────────────────────────────┘

```

### End-to-End Prediction Flow

```text
[ Select Student ID ] ──► [ Fetch Neon DB Records ] ──► [ Build ML Feature Payload ]
                                                                   │
[ Trigger Interventions ] ◄── [ Store Risk Score ] ◄── [ Execute ML Model In FastAPI ]

```

---

## 💻 Tech Stack

| Domain | Technologies |
| --- | --- |
| **Frontend** | React, Vite, TypeScript, Tailwind CSS / UI Libraries |
| **Backend API** | Node.js, Express, TypeScript |
| **Database** | Neon PostgreSQL (Raw Parameterized SQL) |
| **Machine Learning** | Python, FastAPI, Scikit-learn, Pandas, NumPy |
| **Tooling & Ops** | Git, npm, Uvicorn |

---

## 📂 Project Structure

```text
ARAMBH-ASCEND/
├── client/                         # React Frontend Application
│   ├── src/
│   ├── public/
│   └── package.json
│
├── server/                         # Main Node.js Backend
│   ├── src/
│   │   ├── config/                 # DB & App Configurations
│   │   ├── controllers/            # API Route Handlers
│   │   ├── middleware/             # Auth & Validation
│   │   ├── routes/                 # Express Routes
│   │   ├── services/               # Feature Builder & Logic
│   │   └── types/                  # TypeScript Interfaces
│   │
│   └── ml/
│       ├── source/                 # Local ML Training Workspace (Git-ignored)
│       └── service/                # Deployment-ready FastAPI Service
│           ├── main.py             # FastAPI Application Entrypoint
│           ├── requirements.txt    # Python Dependencies
│           └── app/                # Models, Schemas, & Prediction Services
│
├── README.md
└── .gitignore

```

---

## 📊 Data & Model Features

The system computes features across four primary dimensions to assess risk:

1. **Demographic & Background:** Gender, region, age band, previous attempts, studied credits, disability status.
2. **Academic Performance:** Assessment scores, quiz completion rates, ratio of missed tests.
3. **Submission Behavior:** Late submission frequency, average delay in days, status history.
4. **LMS Engagement:** Total clicks, active learning days, platform activity frequency, decay rates.

---

## 🗺 Development Roadmap

| Phase | Description | Status |
| --- | --- | --- |
| **01** | Core Backend Foundation & Node Setup | ✅ Completed |
| **02** | Neon PostgreSQL Schema & DB Integration | ✅ Completed |
| **03** | Automated ML Feature Builder Pipeline | ✅ Completed |
| **04** | Synthetic Test Data & Seed Scripts | ✅ Completed |
| **05** | Standalone FastAPI Prediction Microservice | 🚧 In Progress |
| **06** | Express-to-FastAPI Integration | ⏳ Planned |
| **07** | Historical Prediction Storage & Auditing | ⏳ Planned |
| **08** | ML2 Risk Intelligence Engine | ⏳ Planned |
| **09** | Automated Smart Alerts | ⏳ Planned |
| **10** | Intervention Recommendation & Outcome Tracker | ⏳ Planned |
| **11** | Faculty & Administrator Analytics Dashboards | ⏳ Planned |
| **12** | Complete System Audit Logs & Role Permissions | ⏳ Planned |
| **13** | E2E Testing, Optimization & Demo Readiness | ⏳ Planned |

---

## 🚀 Getting Started

### Prerequisites

* Node.js (v18+)
* Python (v3.9+)
* Neon PostgreSQL Account (or local Postgres instance)

---

### 1. Repository Setup

```bash
git clone [https://github.com/your-username/ARAMBH-ASCEND.git](https://github.com/your-username/ARAMBH-ASCEND.git)
cd ARAMBH-ASCEND

```

---

### 2. Frontend Setup

```bash
cd client
npm install
npm run dev

```

---

### 3. Backend Setup

```bash
cd ../server
npm install

```

Create a `.env` file inside the `server/` directory:

```env
PORT=5000
DATABASE_URL=postgresql://user:password@ep-example-123456.neon.tech/neondb?sslmode=require
ML_SERVICE_URL=http://localhost:8000

```

Start the backend development server:

```bash
npm run dev

```

---

### 4. ML Service Setup

```bash
cd ml/service

# Create and activate virtual environment
python -m venv venv

# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Launch FastAPI service
uvicorn main:app --reload --port 8000

```

#### ML Endpoint Diagnostics

* **Health Check:** `GET http://localhost:8000/health`
* **Run Inference:** `POST http://localhost:8000/predict`

---

## 🌐 Alignment with UN SDG 4

> **Target 4.1 & 4.3:** Ensuring equitable, inclusive, and quality education for all.

By transforming reactive administration into **proactive support**, AARAMBH ASCEND™ equips schools and universities with early visibility—preventing unnecessary dropouts and keeping students on track toward graduation.

---

## 🔒 Responsible AI & Privacy

* **Decision Support, Not Automation:** Dropout probabilities are designed purely to guide faculty review. No automated academic actions are taken against students.
* **Data Security:** All raw DB connections utilize SSL (`neon.tech`), parameterized SQL queries to prevent injection attacks, and strict role-based access control (RBAC).

---
