-- AI Hospital Queue & Patient Flow Manager
-- Database Schema (PostgreSQL)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & STAFF
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('admin', 'receptionist', 'triage', 'doctor', 'lab')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. DEPARTMENTS
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL, -- e.g. GEN, PED, CARD, LAB, RAD, EMER
    name VARCHAR(100) NOT NULL,
    description TEXT,
    average_service_time_minutes INTEGER DEFAULT 15,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. DOCTORS
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    specialization VARCHAR(100) NOT NULL,
    room_number VARCHAR(20) NOT NULL,
    status VARCHAR(30) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'BUSY', 'ON_BREAK', 'OFF_DUTY')),
    consultation_duration_minutes INTEGER DEFAULT 15,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. DOCTOR SCHEDULES
CREATE TABLE IF NOT EXISTS doctor_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 1=Mon, ..., 6=Sat
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_patients INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_doctor_schedule_day UNIQUE (doctor_id, day_of_week)
);

-- 5. PATIENTS
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id_display VARCHAR(30) UNIQUE NOT NULL, -- e.g. PAT-20261111-4821
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    phone VARCHAR(30) NOT NULL,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(30),
    blood_group VARCHAR(10),
    allergies TEXT,
    medical_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for rapid patient lookup
CREATE INDEX IF NOT EXISTS idx_patients_display_id ON patients(patient_id_display);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(last_name, first_name);

-- 6. QUEUE TICKETS
CREATE TABLE IF NOT EXISTS queue_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(30) NOT NULL, -- e.g. GEN-001, LAB-002
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL', 'URGENT', 'EMERGENCY')),
    status VARCHAR(30) NOT NULL DEFAULT 'WAITING' CHECK (status IN (
        'WAITING',
        'CALLED',
        'SERVING',
        'REFERRED_TO_LAB',
        'LAB_COMPLETED',
        'COMPLETED',
        'CANCELLED'
    )),
    estimated_wait_minutes INTEGER DEFAULT 0,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    called_at TIMESTAMP WITH TIME ZONE,
    served_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Critical priority index: Emergency first, then Urgent, then Normal; tie-breaker by issued_at
CREATE INDEX IF NOT EXISTS idx_queue_active_priority 
ON queue_tickets (department_id, status, priority, issued_at);

-- 7. LABORATORY REFERRALS
CREATE TABLE IF NOT EXISTS lab_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    referring_doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    source_queue_ticket_id UUID NOT NULL REFERENCES queue_tickets(id) ON DELETE CASCADE,
    lab_queue_ticket_id UUID REFERENCES queue_tickets(id) ON DELETE SET NULL,
    test_type VARCHAR(100) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL', 'URGENT', 'EMERGENCY')),
    clinical_notes TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING',
        'SAMPLE_COLLECTED',
        'PROCESSING',
        'COMPLETED',
        'CANCELLED'
    )),
    results_summary TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_referrals_patient ON lab_referrals(patient_id);
CREATE INDEX IF NOT EXISTS idx_referrals_doctor ON lab_referrals(referring_doctor_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON lab_referrals(status);

-- 8. PATIENT MOVEMENTS (Audit Trail of Patient Flow)
CREATE TABLE IF NOT EXISTS patient_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    queue_ticket_id UUID REFERENCES queue_tickets(id) ON DELETE SET NULL,
    from_station VARCHAR(50) NOT NULL,
    to_station VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_movements_patient ON patient_movements(patient_id, timestamp);

-- 9. AI FLOW & OVERCROWDING LOGS
CREATE TABLE IF NOT EXISTS ai_flow_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    waiting_count INTEGER NOT NULL DEFAULT 0,
    serving_count INTEGER NOT NULL DEFAULT 0,
    active_doctors_count INTEGER NOT NULL DEFAULT 0,
    average_wait_minutes NUMERIC(5,2) DEFAULT 0,
    congestion_ratio NUMERIC(5,2) DEFAULT 0,
    alert_level VARCHAR(20) DEFAULT 'NORMAL' CHECK (alert_level IN ('NORMAL', 'ELEVATED', 'CRITICAL')),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
