const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function seed() {
  console.log('🌱 Seeding database with synthetic test data...');
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // 1. Departments
    console.log('... Inserting hospital departments');
    const deptRows = await client.query(`
      INSERT INTO departments (code, name, description, average_service_time_minutes)
      VALUES 
        ('GEN', 'General Medicine', 'Primary outpatient adult care and family practice', 15),
        ('PED', 'Pediatrics', 'Comprehensive infant, child, and adolescent healthcare', 18),
        ('CARD', 'Cardiology', 'Specialized cardiovascular diagnostics and consultations', 25),
        ('EMER', 'Emergency & Trauma', 'Immediate urgent and critical emergency care', 10),
        ('LAB', 'Laboratory Services', 'Diagnostic pathology, blood tests, and clinical analysis', 12),
        ('RAD', 'Radiology & Imaging', 'Diagnostic X-ray, Ultrasound, and CT scanning', 20)
      ON CONFLICT (code) DO UPDATE 
        SET name = EXCLUDED.name, 
            description = EXCLUDED.description,
            average_service_time_minutes = EXCLUDED.average_service_time_minutes
      RETURNING id, code, name;
    `);

    const depts = {};
    deptRows.rows.forEach(d => { depts[d.code] = d.id; });

    // 2. Users (Staff accounts)
    console.log('... Inserting hospital staff users');
    const defaultSalt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('Admin@123', defaultSalt);
    const staffHash = await bcrypt.hash('Staff@123', defaultSalt);
    const doctorHash = await bcrypt.hash('Doctor@123', defaultSalt);

    const userQueries = [
      { u: 'admin', e: 'admin@hospital.local', p: adminHash, name: 'System Administrator', r: 'admin' },
      { u: 'receptionist1', e: 'reception1@hospital.local', p: staffHash, name: 'Sarah Receptionist', r: 'receptionist' },
      { u: 'nurse1', e: 'nurse1@hospital.local', p: staffHash, name: 'Nurse Clara Barton', r: 'triage' },
      { u: 'dr.smith', e: 'dr.smith@hospital.local', p: doctorHash, name: 'Dr. Gregory Smith, MD', r: 'doctor' },
      { u: 'dr.chen', e: 'dr.chen@hospital.local', p: doctorHash, name: 'Dr. Emily Chen, MD', r: 'doctor' },
      { u: 'dr.patel', e: 'dr.patel@hospital.local', p: doctorHash, name: 'Dr. Rajesh Patel, MD', r: 'doctor' },
      { u: 'dr.adams', e: 'dr.adams@hospital.local', p: doctorHash, name: 'Dr. Marcus Adams, MD', r: 'doctor' },
      { u: 'labtech1', e: 'labtech1@hospital.local', p: staffHash, name: 'Alexander Fleming (Tech)', r: 'lab' },
    ];

    const usersMap = {};
    for (const u of userQueries) {
      const res = await client.query(`
        INSERT INTO users (username, email, password_hash, full_name, role)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (username) DO UPDATE
          SET full_name = EXCLUDED.full_name,
              password_hash = EXCLUDED.password_hash,
              role = EXCLUDED.role
        RETURNING id, username;
      `, [u.u, u.e, u.p, u.name, u.r]);
      usersMap[u.u] = res.rows[0].id;
    }

    // 3. Doctors
    console.log('... Registering doctor profiles & rooms');
    const doctorsData = [
      { user: 'dr.smith', dept: depts['GEN'], spec: 'Internal Medicine', room: 'Room 101', duration: 15 },
      { user: 'dr.chen', dept: depts['PED'], spec: 'Pediatric Care', room: 'Room 102', duration: 18 },
      { user: 'dr.patel', dept: depts['CARD'], spec: 'Interventional Cardiology', room: 'Room 201', duration: 25 },
      { user: 'dr.adams', dept: depts['EMER'], spec: 'Emergency Medicine', room: 'ER-Bay 1', duration: 10 },
    ];

    const doctorsMap = {};
    for (const doc of doctorsData) {
      const res = await client.query(`
        INSERT INTO doctors (user_id, department_id, specialization, room_number, status, consultation_duration_minutes)
        VALUES ($1, $2, $3, $4, 'AVAILABLE', $5)
        ON CONFLICT (user_id) DO UPDATE
          SET department_id = EXCLUDED.department_id,
              specialization = EXCLUDED.specialization,
              room_number = EXCLUDED.room_number,
              consultation_duration_minutes = EXCLUDED.consultation_duration_minutes,
              status = 'AVAILABLE'
        RETURNING id, room_number;
      `, [usersMap[doc.user], doc.dept, doc.spec, doc.room, doc.duration]);
      doctorsMap[doc.user] = res.rows[0].id;

      // Seed schedules for weekdays (Monday through Friday: 1 to 5)
      for (let day = 1; day <= 5; day++) {
        await client.query(`
          INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, max_patients)
          VALUES ($1, $2, '08:00:00', '17:00:00', 30)
          ON CONFLICT (doctor_id, day_of_week) DO NOTHING;
        `, [res.rows[0].id, day]);
      }
    }

    // 4. Synthetic Patients
    console.log('... Inserting fictional synthetic patients');
    const patientsData = [
      {
        idDisplay: 'PAT-20261111-1001',
        first: 'Arthur',
        last: 'Pendelton',
        dob: '1984-05-12',
        gender: 'Male',
        phone: '+1-555-0101',
        emName: 'Gwen Pendelton',
        emPhone: '+1-555-0102',
        blood: 'O+',
        allergies: 'Penicillin',
        notes: 'Mild seasonal allergies, baseline hypertension'
      },
      {
        idDisplay: 'PAT-20261111-1002',
        first: 'Eleanor',
        last: 'Vance',
        dob: '1992-09-23',
        gender: 'Female',
        phone: '+1-555-0103',
        emName: 'Thomas Vance',
        emPhone: '+1-555-0104',
        blood: 'A+',
        allergies: 'None known',
        notes: 'Annual routine health check'
      },
      {
        idDisplay: 'PAT-20261111-1003',
        first: 'Liam',
        last: 'O\'Connor',
        dob: '2018-03-15',
        gender: 'Male',
        phone: '+1-555-0105',
        emName: 'Fiona O\'Connor (Mother)',
        emPhone: '+1-555-0106',
        blood: 'B+',
        allergies: 'Peanuts',
        notes: 'High fever and persistent cough for 48 hours'
      },
      {
        idDisplay: 'PAT-20261111-1004',
        first: 'Beatrice',
        last: 'Montgomery',
        dob: '1958-11-04',
        gender: 'Female',
        phone: '+1-555-0107',
        emName: 'Robert Montgomery',
        emPhone: '+1-555-0108',
        blood: 'AB-',
        allergies: 'Sulfa antibiotics',
        notes: 'Subacute chest tightness radiating to left shoulder'
      },
      {
        idDisplay: 'PAT-20261111-1005',
        first: 'Carlos',
        last: 'Ramirez',
        dob: '1979-07-29',
        gender: 'Male',
        phone: '+1-555-0109',
        emName: 'Maria Ramirez',
        emPhone: '+1-555-0110',
        blood: 'O-',
        allergies: 'Latex',
        notes: 'Severe abdominal pain, acute triage evaluation'
      }
    ];

    const patientsMap = {};
    for (const p of patientsData) {
      const res = await client.query(`
        INSERT INTO patients (
          patient_id_display, first_name, last_name, date_of_birth, gender,
          phone, emergency_contact_name, emergency_contact_phone, blood_group,
          allergies, medical_notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (patient_id_display) DO UPDATE
          SET phone = EXCLUDED.phone,
              allergies = EXCLUDED.allergies,
              medical_notes = EXCLUDED.medical_notes
        RETURNING id, patient_id_display;
      `, [
        p.idDisplay, p.first, p.last, p.dob, p.gender,
        p.phone, p.emName, p.emPhone, p.blood, p.allergies, p.notes
      ]);
      patientsMap[p.idDisplay] = res.rows[0].id;
    }

    // 5. Active Queue Tickets with Priorities
    console.log('... Seeding initial queue tickets across departments');
    // Clean old tickets for fresh test state
    await client.query('DELETE FROM patient_movements');
    await client.query('DELETE FROM lab_referrals');
    await client.query('DELETE FROM queue_tickets');

    // Arthur -> General Medicine (Ticket GEN-001) - Serving by Dr. Smith
    const t1 = await client.query(`
      INSERT INTO queue_tickets (
        ticket_number, patient_id, department_id, doctor_id, priority, status,
        estimated_wait_minutes, issued_at, called_at, served_at
      ) VALUES (
        'GEN-001', $1, $2, $3, 'NORMAL', 'SERVING',
        0, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '10 minutes'
      ) RETURNING id;
    `, [patientsMap['PAT-20261111-1001'], depts['GEN'], doctorsMap['dr.smith']]);

    // Eleanor -> General Medicine (Ticket GEN-002) - Waiting
    await client.query(`
      INSERT INTO queue_tickets (
        ticket_number, patient_id, department_id, priority, status,
        estimated_wait_minutes, issued_at
      ) VALUES (
        'GEN-002', $1, $2, 'NORMAL', 'WAITING',
        15, NOW() - INTERVAL '20 minutes'
      );
    `, [patientsMap['PAT-20261111-1002'], depts['GEN']]);

    // Liam -> Pediatrics (Ticket PED-001) - Waiting (URGENT fever)
    await client.query(`
      INSERT INTO queue_tickets (
        ticket_number, patient_id, department_id, doctor_id, priority, status,
        estimated_wait_minutes, issued_at
      ) VALUES (
        'PED-001', $1, $2, $3, 'URGENT', 'WAITING',
        5, NOW() - INTERVAL '15 minutes'
      );
    `, [patientsMap['PAT-20261111-1003'], depts['PED'], doctorsMap['dr.chen']]);

    // Beatrice -> Cardiology (Ticket CARD-001) - EMERGENCY
    await client.query(`
      INSERT INTO queue_tickets (
        ticket_number, patient_id, department_id, doctor_id, priority, status,
        estimated_wait_minutes, issued_at
      ) VALUES (
        'CARD-001', $1, $2, $3, 'EMERGENCY', 'CALLED',
        0, NOW() - INTERVAL '10 minutes'
      );
    `, [patientsMap['PAT-20261111-1004'], depts['CARD'], doctorsMap['dr.patel']]);

    // Carlos -> Referred to Lab for Complete Blood Count
    const labTicket = await client.query(`
      INSERT INTO queue_tickets (
        ticket_number, patient_id, department_id, priority, status,
        estimated_wait_minutes, issued_at
      ) VALUES (
        'LAB-001', $1, $2, 'URGENT', 'WAITING',
        10, NOW() - INTERVAL '10 minutes'
      ) RETURNING id;
    `, [patientsMap['PAT-20261111-1005'], depts['LAB']]);

    // Lab referral entry linking Carlos to Dr. Adams
    await client.query(`
      INSERT INTO lab_referrals (
        patient_id, referring_doctor_id, source_queue_ticket_id, lab_queue_ticket_id,
        test_type, priority, clinical_notes, status, requested_at
      ) VALUES (
        $1, $2, $3, $4,
        'Complete Blood Count & Liver Panel', 'URGENT',
        'Acute RUQ abdominal pain, assess inflammatory markers and transaminases',
        'SAMPLE_COLLECTED', NOW() - INTERVAL '8 minutes'
      );
    `, [
      patientsMap['PAT-20261111-1005'],
      doctorsMap['dr.adams'],
      t1.rows[0].id,
      labTicket.rows[0].id
    ]);

    // Record initial movements
    await client.query(`
      INSERT INTO patient_movements (patient_id, queue_ticket_id, from_station, to_station, status, notes)
      VALUES 
        ($1, $2, 'RECEPTION', 'TRIAGE', 'TRIAGED', 'Initial check-in completed, vitals stable'),
        ($1, $2, 'TRIAGE', 'DOCTOR_ROOM', 'IN_CONSULTATION', 'Patient in Room 101 with Dr. Smith'),
        ($3, $4, 'DOCTOR_ROOM', 'LAB', 'REFERRED', 'Referred to Laboratory for emergency blood panel')
    `, [
      patientsMap['PAT-20261111-1001'], t1.rows[0].id,
      patientsMap['PAT-20261111-1005'], labTicket.rows[0].id
    ]);

    // 6. Preload AI metrics baseline
    for (const code of ['GEN', 'PED', 'CARD', 'EMER', 'LAB']) {
      await client.query(`
        INSERT INTO ai_flow_metrics (
          department_id, waiting_count, serving_count, active_doctors_count,
          average_wait_minutes, congestion_ratio, alert_level
        ) VALUES ($1, 2, 1, 1, 15.0, 0.85, 'NORMAL');
      `, [depts[code]]);
    }

    await client.query('COMMIT');
    console.log('✅ Synthetic clinical database seeding finished successfully!');
    console.log('----------------------------------------------------');
    console.log('Staff Login Credentials (Password is case sensitive):');
    console.log('  Admin:        admin         / Admin@123');
    console.log('  Receptionist: receptionist1 / Staff@123');
    console.log('  Triage Nurse: nurse1        / Staff@123');
    console.log('  Doctor (Gen): dr.smith      / Doctor@123');
    console.log('  Doctor (Ped): dr.chen       / Doctor@123');
    console.log('  Doctor (Card):dr.patel      / Doctor@123');
    console.log('  Doctor (ER):  dr.adams      / Doctor@123');
    console.log('  Lab Tech:     labtech1      / Staff@123');
    console.log('----------------------------------------------------');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
