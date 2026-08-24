ARAMBHX

Live Demo

Production Website: https://arambhx.vercel.app

Production Backend API: https://arambhx-api.vercel.app

Production ML Service: https://arambhx-ml.onrender.com

GitHub Repository: https://github.com/pranaypansara/Smart-India-Hackathon

The frontend is deployed on Vercel, the Express backend is deployed on Vercel, the FastAPI ML service is deployed on Render, and the database is hosted on Neon PostgreSQL.

Production Demo Accounts

All demo accounts use the password:

ArambhDemo!2026

Role

Email

ADMIN

admin@arambh.demo

FACULTY

faculty@arambh.demo

COUNSELOR

counselor@arambh.demo

STUDENT

student@arambh.demo

ARAMBHX is an AI-powered student dropout risk monitoring and intervention system. It helps institutions identify students who may be at risk, analyze their academic and engagement patterns, generate predictions using machine learning, and support staff in taking timely interventions.

The system combines a React frontend, Express backend, Neon PostgreSQL database, and Python-based ML services.

Features

Role-based authentication

Four user roles:

ADMIN

FACULTY

COUNSELOR

STUDENT

Student monitoring and profiles

Student ownership restrictions

ML-based dropout risk prediction

ML risk intelligence and trend analysis

Prediction history

Risk levels and probabilities

High-risk student identification

Smart alerts

Intervention recommendations

Intervention status tracking

Notification system

Reports and analytics

Outcomes and impact tracking

Risk trend visualization

Academic and student data analysis

Admin audit logs

Real-time data from Neon PostgreSQL

Historical student data for meaningful charts and trends

System Architecture

                         ┌─────────────────────┐
                         │      Frontend       │
                         │    React + Vite     │
                         │     Port: 5173      │
                         └──────────┬──────────┘
                                    │
                                    │ API Requests
                                    ▼
                         ┌─────────────────────┐
                         │      Backend        │
                         │ Express + TypeScript│
                         │     Port: 5000      │
                         └───────┬───────┬─────┘
                                 │       │
                                 │       │
                                 ▼       ▼
                    ┌────────────────┐  ┌─────────────────┐
                    │ Neon PostgreSQL│  │   ML Service    │
                    │                │  │ Python + FastAPI│
                    └────────────────┘  │   Port: 8000    │
                                        └────────┬────────┘
                                                 │
                                      ┌──────────┴──────────┐
                                      │                     │
                                      ▼                     ▼
                                   ML1 Model             ML2 Model
                              Risk Prediction       Risk Intelligence
Tech Stack
Frontend
React
Vite
JavaScript
React Router
Charts and data visualization
Backend
Node.js
Express.js
TypeScript
JWT Authentication
Role-Based Access Control
Database
Neon PostgreSQL
Machine Learning
Python
FastAPI
Scikit-learn
XGBoost
Pandas
NumPy
Joblib
User Roles
ADMIN

Administrators can access system-wide information and management features.

Capabilities include:

View student data
Monitor student risk
View alerts
Manage interventions
Access reports
View audit logs
Monitor overall system activity
FACULTY

Faculty members can monitor students and access relevant academic and risk information.

Capabilities include:

View assigned or accessible student data
Monitor student risk
View predictions
View alerts
Support interventions
Access reports and analytics
COUNSELOR

Counselors focus on students requiring attention and intervention.

Capabilities include:

View high-risk students
View smart alerts
Review risk factors
Manage interventions
Track intervention progress
Monitor outcomes
STUDENT

Students have restricted access to their own information.

Capabilities include:

View their own dashboard
View authorized academic and student information
Access relevant support information

Students cannot access another student's data.

ML Pipeline

The system uses a two-stage machine learning pipeline.

Student Data
      │
      ▼
Feature Generation
      │
      ▼
ML1: Dropout Risk Prediction
      │
      ▼
Risk Probability + Risk Level
      │
      ▼
Store Prediction in Neon PostgreSQL
      │
      ▼
Prediction History
      │
      ▼
ML2: Risk Intelligence
      │
      ├── Risk Trend
      ├── Risk Velocity
      ├── Risk History Analysis
      └── Recommendations
      │
      ▼
Alert Generation
      │
      ▼
Intervention Recommendation
      │
      ▼
Intervention Tracking
      │
      ▼
Notifications

The ML service exposes:

GET /health
POST /predict
POST /ml2/analyze
Project Structure
Smart-India-Hackathon/
│
├── client/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── server/
│   ├── src/
│   ├── ml/
│   │   └── service/
│   │       ├── main.py
│   │       ├── requirements.txt
│   │       ├── venv/
│   │       └── ...
│   │
│   ├── package.json
│   ├── .env
│   └── ...
│
└── README.md
Prerequisites

Make sure the following are installed:

Node.js 18+
npm
Python 3.11+
pip
Git

You also need access to the project's Neon PostgreSQL database.

Environment Setup
Backend Environment Variables

Create a .env file inside:

server/.env

Add the required environment variables used by the backend.

Example:

DATABASE_URL=your_neon_postgresql_connection_string
JWT_SECRET=your_jwt_secret
ML_SERVICE_URL=http://localhost:8000

Use the actual environment variable names required by the current backend implementation.

Never commit your real .env file or database credentials.

Frontend Environment Variables

If required by your frontend configuration, create:

client/.env

For local development:

VITE_API_BASE_URL=/api

The Vite development server proxies API requests to the backend.

How to Run the Project

The project consists of three services:

ML Service
Backend
Frontend

Open three separate Git Bash terminals.

1. Start the ML Service

Open the first Git Bash terminal.

cd "/c/Coding Projects/SIH 2026/Smart-India-Hackathon/server/ml/service"

Activate the Python virtual environment:

source venv/Scripts/activate

Start the FastAPI ML service:

python main.py

The ML service runs on:

http://localhost:8000

Verify it by opening:

http://localhost:8000/health

Expected response should indicate that the service and models are loaded, similar to:

{
  "status": "healthy",
  "model_loaded": true,
  "ml2_loaded": true
}
2. Start the Backend

Open the second Git Bash terminal.

cd "/c/Coding Projects/SIH 2026/Smart-India-Hackathon/server"

Start the backend:

npm run dev

The backend runs on:

http://localhost:5000

Verify it using:

http://localhost:5000/api/health

The backend connects to:

Neon PostgreSQL
JWT authentication
ML service running on port 8000
3. Start the Frontend

Open the third Git Bash terminal.

cd "/c/Coding Projects/SIH 2026/Smart-India-Hackathon/client"

Start the frontend:

npm run dev

The frontend runs on:

http://localhost:5173

Open the application:

http://localhost:5173
Demo Accounts

The following demo accounts are available for testing.

All accounts use the same password:

ArambhDemo!2026
Role	Email
ADMIN	admin@arambh.demo
FACULTY	faculty@arambh.demo
COUNSELOR	counselor@arambh.demo
STUDENT	student@arambh.demo
Testing the System

After starting all three services, test the application using the following flow.

Health Checks
ML Service
http://localhost:8000/health
Backend
http://localhost:5000/api/health
Frontend
http://localhost:5173
Authentication Testing

Test each role individually:

Login as ADMIN
Verify the correct dashboard and role-based access
Logout
Login as FACULTY
Verify faculty access
Logout
Login as COUNSELOR
Verify counselor access
Logout
Login as STUDENT
Verify the student dashboard and restricted access

The application should correctly switch between accounts without retaining stale authentication data from the previous user.

Student Ownership Testing

Login as a STUDENT.

Verify that the student can access their own authorized data.

Attempting to access another student's protected data should be rejected by the backend.

This restriction is enforced through role-based access control and student ownership validation.

ML Pipeline Testing

The complete pipeline can be tested as follows:

Student Data
→ Feature Generation
→ ML1 Prediction
→ Prediction Storage
→ Prediction History
→ ML2 Risk Analysis
→ Alert Generation
→ Intervention Recommendation
→ Intervention Status Update
→ Notification Generation

The system supports:

Risk probability
Risk levels
Risk history
Risk trends
Risk velocity
Alert generation
Intervention recommendations
Intervention tracking
Notification persistence
Production Builds
Frontend Build
cd "/c/Coding Projects/SIH 2026/Smart-India-Hackathon/client"
npm run build
Backend Build
cd "/c/Coding Projects/SIH 2026/Smart-India-Hackathon/server"
npm run build
Important Notes
The Neon PostgreSQL database is external and must be accessible through the configured DATABASE_URL.
The backend requires a valid JWT_SECRET.
The backend must be able to reach the ML service.
The ML service must have access to all required model artifacts.
The Python venv is used for local development and should not be committed to Git.
Do not commit .env files containing real credentials.
The frontend, backend, and ML service must all be running for the complete system to work locally.
Security

ARAMBHX uses:

JWT-based authentication
Role-based access control
Protected routes
Backend authorization checks
Student ownership restrictions
Environment variables for secrets and credentials

The valid application roles are:

ADMIN
FACULTY
COUNSELOR
STUDENT
Current Data

The system uses realistic demo data stored in Neon PostgreSQL, including:

Approximately 35–45 students
Historical student records
Multiple data timelines
ML predictions
Prediction history
Different risk levels
High-risk students
Alerts
Interventions
Notifications

The historical data supports charts, reports, risk trends, and analytics.

Main Functional Flow
                    Student Data
                         │
                         ▼
                  Feature Generation
                         │
                         ▼
                 ML1 Risk Prediction
                         │
                         ▼
                Risk Probability/Level
                         │
                         ▼
                 Neon PostgreSQL Storage
                         │
                         ▼
                 ML2 Risk Intelligence
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
          Risk Trend   History   Recommendations
              │
              ▼
            Alerts
              │
              ▼
        Interventions
              │
              ▼
       Status Tracking
              │
              ▼
        Notifications
              │
              ▼
          Dashboards
          Reports
          Analytics
License

This project is developed as part of an academic and hackathon project.

ARAMBHX

AI-powered student risk monitoring, prediction, and intervention management system.
