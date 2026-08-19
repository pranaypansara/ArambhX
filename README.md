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
└────────────────────────────────┬────────────────────────────────┘
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
| **05** | Standalone FastAPI Prediction Microservice | ✅ Completed |
| **06** | Express-to-FastAPI Integration | ✅ Completed |
| **07** | Historical Prediction Storage & Auditing | ✅ Completed |
| **08** | ML2 Risk Intelligence Engine | ✅ Completed |
| **09** | Automated Smart Alerts | ✅ Completed |
| **10** | Intervention Recommendation & Outcome Tracker | ✅ Completed |
| **11** | Faculty & Administrator Analytics Dashboards | ✅ Completed |
| **12** | Complete System Audit Logs & Role Permissions | ✅ Completed |
| **13** | E2E Testing, Optimization & Demo Readiness | ✅ Completed |

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

## Development status

| Phase | Area | Status |
|-------|------|--------|
| 1 | Backend foundation (Node/Express/TS, Neon, raw SQL) | Completed |
| 2 | Database & API foundation (auth, RBAC, students, records) | Completed |
| 3 | ML feature builder (`GET /api/students/:id/ml-features`) | Completed |
| 4 | ML demo/test data seeding + feature validation | Completed |
| 5 | Standalone FastAPI ML1 prediction service (`server/ml/service`) | Completed |
| 6 | Node.js ↔ FastAPI integration (`POST /api/students/:id/predict`) | Completed |
| 7 | Prediction storage and history (`POST /api/students/:id/predict`, `GET /api/students/:id/predictions`) | Completed |
| 8+ | Alerts, interventions, dashboards | Planned |

## Backend & ML service architecture

```
             ┌────────────────────────────────┐
             │   Node.js / Express backend    │
             │   (server/)                    │
             │  • auth + RBAC                 │
             │  • students / records APIs     │
             │  • ML feature builder (Ph. 3)  │
             │  • prediction orchestration    │
             │  • prediction storage (Ph. 7)  │
             └──────────────┬─────────────────┘
                            │ HTTP (JSON)
                            ▼
             ┌────────────────────────────────┐
             │   FastAPI ML1 service          │
             │   (server/ml/service/)         │
             │  • loads ML1 pipeline (Ph. 5)  │
             │  • validates feature payload   │
             │  • runs prediction + threshold │
             └──────────────┬─────────────────┘
                            │
                            ▼
             ┌────────────────────────────────┐
             │   Neon PostgreSQL              │
             │  • predictions table           │
             │  • prediction_factors table    │
             └────────────────────────────────┘
```

### ML prediction flow (Phase 7)

1. Client calls `POST /api/students/:studentId/predict`
2. Backend validates the student ID and confirms the student exists
3. Backend builds the exact 35-field ML1 feature payload using the Phase 3 feature builder
4. Backend sends the payload to the FastAPI ML service `POST /predict`
5. FastAPI validates the payload against its Pydantic schema
6. FastAPI runs the saved ML1 pipeline and returns the prediction result
7. Backend validates the FastAPI response
8. Backend persists the prediction result in Neon PostgreSQL (`predictions` table)
9. Backend returns the prediction with storage metadata to the client

Predictions are now stored in the database and can be retrieved via the history endpoints.

## Configuration (backend)

Copy `server/.env.example` to `server/.env` and set:

| Variable                | Default               | Purpose                                   |
|-------------------------|-----------------------|-------------------------------------------|
| `PORT`                  | `5000`                | Backend HTTP port                         |
| `DATABASE_URL`          | —                     | Neon PostgreSQL connection string         |
| `JWT_SECRET`            | —                     | JWT signing secret                        |
| `JWT_EXPIRES_IN`        | `7d`                  | JWT lifetime                              |
| `ML_SERVICE_URL`        | `http://localhost:8000` | Base URL of the FastAPI ML1 service     |
| `ML_SERVICE_TIMEOUT_MS` | `10000`               | Timeout for ML service requests (ms)      |

## API endpoints (backend)

| Method | Path                              | Access                  | Description                          |
|--------|-----------------------------------|--------------------------|--------------------------------------|
| POST   | `/api/auth/register`              | Public                   | Register a user                       |
| POST   | `/api/auth/login`                 | Public                   | Login, get JWT                        |
| GET    | `/api/students`                   | ADMIN, FACULTY, COUNSELOR | List students (paginated)          |
| GET    | `/api/students/:id`               | ADMIN, FACULTY, COUNSELOR | Get a student                         |
| GET    | `/api/students/:id/summary`       | ADMIN, FACULTY, COUNSELOR | Summary + latest records              |
| GET    | `/api/students/:id/ml-features`   | ADMIN, FACULTY, COUNSELOR | Build ML1 feature payload (Phase 3)   |
| POST   | `/api/students/:id/predict`       | ADMIN, FACULTY, COUNSELOR | Run ML1 prediction + store (Phase 7) |
| GET    | `/api/students/:id/predictions`   | ADMIN, FACULTY, COUNSELOR | Get prediction history (Phase 7)     |
| GET    | `/api/students/:id/predictions/latest` | ADMIN, FACULTY, COUNSELOR | Get latest prediction (Phase 7)   |
| GET    | `/api/ml/health`                  | Public                   | Proxy check of the ML service health  |
| GET    | `/api/health`                     | Public                   | Backend health check                  |

## Known trade-offs (given competition timeline)

- Pulse AI is currently a rule-based assistant over the in-memory mock data (pattern
  matching on the question + student names) — structured so a real LLM/RAG backend call
  can be dropped into `buildAnswer()` in `PulseAIPanel.jsx` without changing the UI.
- No auth flow is wired up yet (role is fixed to the mock `CURRENT_USER`); the `users`
  table and RBAC concept are modeled in the data layer so this is straightforward to add.
- The `ErrorState` component exists in the shared UI kit but isn't triggered anywhere live,
  since all data is synchronous mock data with nothing that can fail — wire it up alongside
  real API calls (a fetch `catch` block is the natural place).
- Bundle is a single chunk (~776 KB / ~224 KB gzip) — fine for a demo; route-based
  `React.lazy` code-splitting is a quick follow-up if needed.

## Database / Data Architecture (Backend)

The Neon PostgreSQL database includes the following key tables for the ML pipeline:

| Table | Purpose | Key Indexes |
|-------|---------|-------------|
| `students` | Core student profiles | PK on `id`, unique on `enrollment_number` |
| `predictions` | ML1 prediction results | PK on `id`, index on `(student_id, predicted_at DESC)` |
| `prediction_factors` | Feature-level impact scores per prediction | PK on `id`, index on `prediction_id` |
| `assessment_records` | Student assessment data | Multiple indexes on `student_id`, `status`, `course_code` |
| `lms_activity_records` | LMS clickstream data | Indexes on `student_id`, `activity_date`, `site_name` |
| `attendance_records` | Attendance percentages | Index on `(student_id, recorded_at DESC)` |
| `academic_records` | Academic performance snapshots | Index on `(student_id, recorded_at DESC)` |

The `predictions` table stores the exact ML1 output: `risk_probability`, `risk_level`, `model_version`, and `predicted_at` timestamp. The existing index on `(student_id, predicted_at DESC)` makes history queries efficient.

---

## 🌐 Alignment with UN SDG 4

> **Target 4.1 & 4.3:** Ensuring equitable, inclusive, and quality education for all.

By transforming reactive administration into **proactive support**, AARAMBH ASCEND™ equips schools and universities with early visibility—preventing unnecessary dropouts and keeping students on track toward graduation.

---

## 🔒 Responsible AI & Privacy

* **Decision Support, Not Automation:** Dropout probabilities are designed purely to guide faculty review. No automated academic actions are taken against students.
* **Data Security:** All raw DB connections utilize SSL (`neon.tech`), parameterized SQL queries to prevent injection attacks, and strict role-based access control (RBAC).

---