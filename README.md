# 🏥 CareFlow AI: Hospital Queue & Patient Flow Manager
### Comprehensive 18-Phase Clinical Operations & AI Platform

A production-grade, full-stack hospital clinical queue management, real-time patient flow orchestration, smart wayfinding navigation, and voice-assisted clinical operations platform.

---

## 🛠️ Complete Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, Vite 6, Tailwind CSS | High-performance reactive UI with role-tailored clinical dashboards |
| **Icons & UI** | Lucide React | Medical, clinical, and navigation icons |
| **Backend** | Node.js, Express.js | Scalable modular REST API, business logic, and service orchestration |
| **Database** | PostgreSQL 18 | ACID-compliant relational database with priority indexing and audit trails |
| **Authentication** | JWT (JSON Web Tokens), bcryptjs | Secure Role-Based Access Control (RBAC) |
| **Real-time Engine** | Socket.IO 4.8 | Low-latency room-based bidirectional WebSocket sync and broadcast chimes |
| **Voice & Speech** | Web Speech API (Synthesis & Recognition) | Spoken queue call announcements and voice-driven assistant chatbot |
| **AI Operational Engine** | M/M/c Queuing Models, EWMA, System Grounding | Wait time estimation, busy hour forecasting, bottleneck radar, and clinical operational assistant |

---

## 👥 User Roles & Portals

| Role | Username | Password | Key Responsibilities |
|---|---|---|---|
| **Receptionist** | `receptionist1` | `Staff@123` | Patient lookup, intake registration (`PAT-YYYYMMDD-XXXX`), ticket issuing |
| **Triage Nurse** | `nurse1` | `Staff@123` | Acuity grading (`NORMAL`, `URGENT`, `EMERGENCY`) with instant queue preemption |
| **Doctor (Gen Med)** | `dr.smith` | `Doctor@123` | Room 101, patient consultations, "Call Patient", lab referrals, repeat voice call |
| **Doctor (Pediatrics)** | `dr.chen` | `Doctor@123` | Room 102, pediatric consultations and department queues |
| **Doctor (Cardiology)** | `dr.patel` | `Doctor@123` | Room 201, cardiovascular clinic and specialty referrals |
| **Doctor (Emergency)** | `dr.adams` | `Doctor@123` | ER-Bay 1, acute emergency triage and fast-track admissions |
| **Laboratory Tech** | `labtech1` | `Staff@123` | Specimen intake, test status updates, result submission with return to doctor |
| **Administrator** | `admin` | `Admin@123` | Staff accounts, doctor shift schedules, map coordinates, system settings |
| **Public TV Billboard** | *No login needed* | *Public* | Privacy-safe lobby display with voice announcements and room indicators |

---

## 📁 Project Directory Structure

```text
ai-hospital-queue-manager/
├── client/                               # Frontend (React 18 + Vite 6 + Tailwind CSS)
│   ├── public/                           # Static assets
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/                   # PriorityBadge, StatusBadge
│   │   │   ├── layout/                   # Navbar with live sync status dot & role tabs
│   │   │   └── chatbot/                  # ChatbotDrawer.jsx (Floating AI Assistant with Voice)
│   │   ├── context/
│   │   │   ├── AuthContext.jsx           # JWT auth state & token storage
│   │   │   └── SocketContext.jsx         # Socket.IO client provider & chime tone
│   │   ├── pages/
│   │   │   ├── auth/Login.jsx            # Unified login with 1-click role switcher
│   │   │   ├── receptionist/             # ReceptionistDashboard.jsx
│   │   │   ├── triage/                   # TriageDashboard.jsx
│   │   │   ├── doctor/                   # DoctorDashboard.jsx (with repeat voice call)
│   │   │   ├── laboratory/               # LaboratoryDashboard.jsx
│   │   │   ├── billboard/                # TVBillboard.jsx (Privacy-safe lobby display with voice)
│   │   │   ├── navigation/               # HospitalNavigation.jsx (Interactive floor map)
│   │   │   ├── analytics/                # AIFlowDashboard.jsx (AI Overcrowding Radar)
│   │   │   └── admin/                    # AdminDashboard.jsx (Schedules & Roster)
│   │   ├── services/
│   │   │   ├── api.js                    # Fetch client with JWT injection
│   │   │   └── voiceService.js           # Web Speech API TTS and Speech Recognition
│   │   ├── App.jsx                       # Master routing & role navigation
│   │   ├── index.css                     # Tailwind directives
│   │   └── main.jsx
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── server/                               # Backend (Node.js + Express.js + Socket.IO)
│   ├── src/
│   │   ├── config/                       # PostgreSQL pool (pg) & environment configs
│   │   ├── controllers/                  # Auth, Patients, Doctors, Queues, Referrals, AI, Navigation, Chatbot, Settings
│   │   ├── middleware/                   # JWT auth guard, RBAC role guard, Error handler
│   │   ├── routes/                       # Express REST endpoints
│   │   ├── services/                     # Business logic, movements, AI, navigation, chatbot, settings
│   │   ├── socket/                       # Socket.IO room manager & event dispatchers
│   │   ├── db/                           # Database schema (schema.sql), migrate.js, migrate_v2.js, seed.js
│   │   └── server.js                     # HTTP server & Socket.IO listener entrypoint
│   ├── tests/
│   │   ├── hospital_flow.test.js         # Integration tests for clinical workflows
│   │   ├── e2e_live_simulation.test.js   # Live multi-client Socket.IO test
│   │   └── navigation_and_chatbot.test.js# Navigation, Chatbot, and Settings tests
│   ├── .env                              # Active environment configuration
│   ├── .env.example
│   └── package.json
│
├── package.json                          # Monorepo runner scripts
└── README.md                             # Comprehensive technical documentation
```

---

## 🚀 How to Run the Application

### 1. Prerequisites
- **Node.js** v20+ / v24+
- **PostgreSQL** running on `localhost:5432` with database `hospital_queue_db`.

### 2. Database Migrations & Synthetic Seed Data
To apply the database schema, navigation coordinates, and realistic test data:
```bash
# In server directory:
cd server
npm run migrate
node src/db/migrate_v2.js
npm run seed
```

### 3. Run Automated Tests
```bash
cd server
npm test
```
*Executes all 13 automated end-to-end integration tests covering authentication, unique patient IDs, priority preemption, billboard privacy, lab referral roundtrips, AI wait time prediction, floor navigation routing, chatbot system grounding, and voice announcement settings.*

### 4. Start the Application
**Terminal 1 (Backend API & Socket.IO server on port 5000):**
```bash
cd server
npm start
```

**Terminal 2 (Frontend React + Vite on port 5173):**
```bash
cd client
npm run dev
```

Open your browser at **`http://localhost:5173`**.

---

## 📑 Complete 18-Phase Architecture Breakdown

### Phase 1: Project Setup and Architecture
- Monorepo folder separation with clean layer abstraction (`client`, `server`, `models`, `controllers`, `services`, `socket`).

### Phase 2: PostgreSQL Database, Migrations & Synthetic Seed Data
- ACID-compliant relational schema with UUID primary keys and composite priority indexes.
- Fictional clinical dataset including departments, physician roster, schedules, and active tickets.

### Phase 3: Frontend Design & Clinical Dashboards
- Tailwind CSS clinical theme with distinct acuity badges (`EMERGENCY` red pulse, `URGENT` amber, `NORMAL` green).
- Clean, responsive layouts for Reception, Triage, Doctor, Laboratory, TV Billboard, Navigation, Analytics, and Admin.

### Phase 4: Backend APIs & Business Logic
- Modular Express.js controllers and service layer enforcing transactional boundaries.

### Phase 5: Authentication & Role-Based Access Control (RBAC)
- JWT bearer token authentication with bcrypt password hashing.
- Role-based middleware guards protecting administrative, doctor, triage, and lab endpoints.

### Phase 6: Patient Registration & Unique Identifiers
- Generates clinical IDs formatted as `PAT-YYYYMMDD-XXXX` (e.g. `PAT-20261111-4821`).
- Multi-field search by ID, Name, or Phone number.

### Phase 7: Doctor Management & Availability
- Physician profiles, specialties, consultation rooms, and availability status controls (`AVAILABLE`, `BUSY`, `ON_BREAK`, `OFF_DUTY`).

### Phase 8: Queue Management & Emergency Acuity Preemption
- Sequential department ticketing (`GEN-001`, `PED-002`, `CARD-001`, `LAB-001`).
- `EMERGENCY` priority immediately pre-empts lower priority entries to take position #1 at the top of the queue.

### Phase 9: Doctor-to-Laboratory Referrals & Patient Tracking
- Doctor orders diagnostic panels directly from consultation desk.
- Automated creation of linked laboratory tickets (`LAB-00X`) without sending the patient back to reception.
- Completing results automatically returns the patient to the doctor's queue with status `LAB_COMPLETED`.
- Station-to-station audit log in `patient_movements`.

### Phase 10: Real-Time Queue Updates (Socket.IO)
- Room-based event dispatching (`billboard:public`, `department:{id}`, `doctor:{id}`, `lab:main`).
- Instant synchronization across all connected staff and TV monitors.

### Phase 11: AI Waiting-Time Prediction & Flow Telemetry
- Dynamic wait time model factoring queue position, active physicians, and priority acceleration factors ($\alpha_{\text{Emergency}}=0.1, \alpha_{\text{Urgent}}=0.55$).

### Phase 12: Reports & Analytics
- Congestion ratio evaluation ($CR = \frac{\text{waiting}}{\text{capacity}}$) with `CRITICAL`, `ELEVATED`, and `NORMAL` alerts.
- Station cycle-time benchmarks highlighting bottlenecks.

### Phase 13: Frontend & Backend Integration
- Unified API client with automatic token attachment and Socket.IO listener binding.

### Phase 14: Automated Testing & Validation
- 13 automated integration tests running against PostgreSQL verifying all core and extended workflows.

### Phase 15: Deployment Preparation & Documentation
- Monorepo runner scripts, production build verification, and deployment guides.

### Phase 16: AI Hospital Assistant Chatbot
- Floating bottom-right toggle button with animated notification badge.
- Grounded in real-time hospital statistics (waiting counts, active doctors, busy departments).
- Provides step-by-step guidance for system procedures (registering patients, adding doctors, managing queues).
- Interactive navigation action buttons embedded in responses.
- Clinical safety guardrails rejecting medical symptom diagnosis or drug prescription queries.
- Configurable AI provider integration with transparent setup status.

### Phase 17: Smart Hospital Navigation & Wayfinding
- Comprehensive department and service directory with floor, wing, and room details.
- Interactive SVG architectural floor map (Floor 1: Ground Atrium/Emergency; Floor 2: Specialists/Laboratory).
- Turn-by-turn text routing with distance in meters and walking time estimates.
- Cross-floor routing via Central Elevators A & B.
- Administrator editing tools for floor coordinates and room numbers.
- Seamless chatbot integration (e.g. asking "Where is the laboratory?" opens the route on the map).

### Phase 18: Voice Assistant & Voice Queue Announcements
- Chatbot microphone voice input using Web Speech Recognition.
- Chatbot voice readout using Web Speech Synthesis with start/stop/mute controls.
- Configurable assistant name (default: "CareFlow Assistant").
- Automated voice announcements on public TV billboard when tickets are called.
- Configurable privacy modes (`FIRST_NAME_AND_TICKET`, `TICKET_ONLY`, `FULL_NAME`).
- "Repeat Announcement" functionality for physicians and waiting room monitors.
