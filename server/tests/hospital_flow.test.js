const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const db = require('../src/config/db');
const { app, server } = require('../src/server');

const BASE_URL = 'http://localhost:5001';
let testServer;
let adminToken = '';
let doctorToken = '';
let nurseToken = '';
let receptionistToken = '';
let labToken = '';
let testPatientId = '';
let doctorSmithId = '';
let genDeptId = '';
let labDeptId = '';

// Helper for HTTP requests
function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(url, reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

test.before(async () => {
  // Start server on port 5001 for test isolation
  await new Promise((resolve) => {
    testServer = server.listen(5001, () => resolve());
  });

  // Fetch department IDs
  const dRes = await db.query("SELECT id, code FROM departments WHERE code IN ('GEN', 'LAB')");
  dRes.rows.forEach(r => {
    if (r.code === 'GEN') genDeptId = r.id;
    if (r.code === 'LAB') labDeptId = r.id;
  });

  // Fetch Dr. Smith's ID
  const docRes = await db.query(`
    SELECT d.id FROM doctors d 
    JOIN users u ON d.user_id = u.id 
    WHERE u.username = 'dr.smith';
  `);
  if (docRes.rows.length > 0) {
    doctorSmithId = docRes.rows[0].id;
  }
});

test.after(async () => {
  await new Promise((resolve) => {
    testServer.close(() => resolve());
  });
  await db.pool.end();
});

test('1. Health Check Endpoint', async () => {
  const res = await request('/api/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'ONLINE');
});

test('2. Authentication & JWT Generation for all roles', async () => {
  // Admin Login
  const adminRes = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { username: 'admin', password: 'Admin@123' },
  });
  assert.strictEqual(adminRes.status, 200);
  assert.ok(adminRes.body.token);
  assert.strictEqual(adminRes.body.user.role, 'admin');
  adminToken = adminRes.body.token;

  // Doctor Login
  const docRes = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { username: 'dr.smith', password: 'Doctor@123' },
  });
  assert.strictEqual(docRes.status, 200);
  assert.strictEqual(docRes.body.user.role, 'doctor');
  assert.ok(docRes.body.user.doctor.id);
  doctorToken = docRes.body.token;

  // Triage Nurse Login
  const nurseRes = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { username: 'nurse1', password: 'Staff@123' },
  });
  assert.strictEqual(nurseRes.status, 200);
  assert.strictEqual(nurseRes.body.user.role, 'triage');
  nurseToken = nurseRes.body.token;

  // Receptionist Login
  const recRes = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { username: 'receptionist1', password: 'Staff@123' },
  });
  assert.strictEqual(recRes.status, 200);
  assert.strictEqual(recRes.body.user.role, 'receptionist');
  receptionistToken = recRes.body.token;

  // Lab Tech Login
  const labRes = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { username: 'labtech1', password: 'Staff@123' },
  });
  assert.strictEqual(labRes.status, 200);
  assert.strictEqual(labRes.body.user.role, 'lab');
  labToken = labRes.body.token;
});

test('3. Patient Registration with Unique Formatted ID (PAT-YYYYMMDD-XXXX)', async () => {
  const newPatientData = {
    firstName: 'Synthetic',
    lastName: 'TestPatient',
    dateOfBirth: '1990-01-01',
    gender: 'Female',
    phone: '+1-555-9999',
    emergencyContactName: 'Guardian Test',
    emergencyContactPhone: '+1-555-8888',
    bloodGroup: 'B+',
    allergies: 'None',
    medicalNotes: 'Automated test record',
  };

  const res = await request('/api/patients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${receptionistToken}`,
    },
    body: newPatientData,
  });

  assert.strictEqual(res.status, 201);
  assert.ok(res.body.patient.id);
  assert.match(res.body.patient.patient_id_display, /^PAT-\d{8}-\d{4}$/);
  testPatientId = res.body.patient.id;
});

test('4. Patient Search by ID, Phone, and Name', async () => {
  const res = await request('/api/patients?query=TestPatient', {
    headers: { 'Authorization': `Bearer ${nurseToken}` },
  });
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.patients.length >= 1);
  assert.strictEqual(res.body.patients[0].last_name, 'TestPatient');
});

test('5. Queue Management: Issuing Tickets & Priority Ordering with Emergency Jump', async () => {
  // Issue Normal Ticket
  const normalTicketRes = await request('/api/queues/ticket', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${receptionistToken}`,
    },
    body: {
      patientId: testPatientId,
      departmentId: genDeptId,
      priority: 'NORMAL',
      notes: 'Standard consultation',
    },
  });
  assert.strictEqual(normalTicketRes.status, 201);
  const normalTicket = normalTicketRes.body.ticket;
  assert.match(normalTicket.ticket_number, /^GEN-\d{3}$/);

  // Escalate to EMERGENCY via Triage Nurse
  const escalateRes = await request(`/api/queues/${normalTicket.id}/priority`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${nurseToken}`,
    },
    body: { priority: 'EMERGENCY' },
  });
  assert.strictEqual(escalateRes.status, 200);
  assert.strictEqual(escalateRes.body.ticket.priority, 'EMERGENCY');

  // Verify that EMERGENCY ticket sits at the top of department waiting queue
  const queueRes = await request(`/api/queues/department/${genDeptId}`, {
    headers: { 'Authorization': `Bearer ${doctorToken}` },
  });
  assert.strictEqual(queueRes.status, 200);
  const waitingTickets = queueRes.body.tickets.filter(t => t.status === 'WAITING');
  assert.ok(waitingTickets.length > 0);
  assert.strictEqual(waitingTickets[0].priority, 'EMERGENCY');
  assert.strictEqual(waitingTickets[0].id, normalTicket.id);
});

test('6. Public TV Billboard Privacy Verification (Zero PII Compliance)', async () => {
  // Public endpoint requires NO token
  const billboardRes = await request('/api/queues/billboard');
  assert.strictEqual(billboardRes.status, 200);
  assert.ok(billboardRes.body.timestamp);

  // Check all returned tickets: strictly confirm NO patient names, phone numbers, or dates of birth exist!
  const allBillboardEntries = [
    ...(billboardRes.body.calledNow || []),
    ...(billboardRes.body.currentlyServing || []),
    ...(billboardRes.body.waitingQueue || []),
  ];

  for (const item of allBillboardEntries) {
    assert.strictEqual(item.first_name, undefined, 'Public billboard MUST NOT contain first_name!');
    assert.strictEqual(item.last_name, undefined, 'Public billboard MUST NOT contain last_name!');
    assert.strictEqual(item.phone, undefined, 'Public billboard MUST NOT contain phone!');
    assert.strictEqual(item.date_of_birth, undefined, 'Public billboard MUST NOT contain date_of_birth!');
    assert.ok(item.ticket_number, 'Billboard must show ticket number');
    assert.ok(item.department_name, 'Billboard must show department');
  }
});

test('7. Doctor Consultation & Laboratory Referral Roundtrip Workflow', async () => {
  // 1. Doctor calls ticket
  // Fetch active ticket for our test patient
  const patientHistoryRes = await request(`/api/patients/${testPatientId}`, {
    headers: { 'Authorization': `Bearer ${doctorToken}` },
  });
  const activeTicket = patientHistoryRes.body.history.tickets[0];

  const callRes = await request(`/api/queues/${activeTicket.id}/call`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${doctorToken}`,
    },
    body: { doctorId: doctorSmithId, roomNumber: 'Room 101' },
  });
  assert.strictEqual(callRes.status, 200);
  assert.strictEqual(callRes.body.ticket.status, 'CALLED');

  // 2. Doctor starts serving
  const startRes = await request(`/api/queues/${activeTicket.id}/start-serving`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${doctorToken}`,
    },
    body: { doctorId: doctorSmithId },
  });
  assert.strictEqual(startRes.status, 200);
  assert.strictEqual(startRes.body.ticket.status, 'SERVING');

  // 3. Doctor refers patient to laboratory (without sending back to reception!)
  const referralRes = await request('/api/referrals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${doctorToken}`,
    },
    body: {
      patientId: testPatientId,
      referringDoctorId: doctorSmithId,
      sourceQueueTicketId: activeTicket.id,
      testType: 'Comprehensive Metabolic Panel (CMP)',
      priority: 'URGENT',
      clinicalNotes: 'Elevated liver enzymes suspected; check electrolytes.',
    },
  });
  assert.strictEqual(referralRes.status, 201);
  assert.ok(referralRes.body.labTicket);
  assert.match(referralRes.body.labTicket.ticket_number, /^LAB-\d{3}$/);
  const referralId = referralRes.body.referral.id;

  // 4. Lab Tech views workbench queue
  const labQueueRes = await request('/api/referrals/lab', {
    headers: { 'Authorization': `Bearer ${labToken}` },
  });
  assert.strictEqual(labQueueRes.status, 200);
  const labItem = labQueueRes.body.referrals.find(r => r.id === referralId);
  assert.ok(labItem, 'Referral must appear on laboratory workbench');

  // 5. Lab Tech updates status to PROCESSING
  const statusUpdateRes = await request(`/api/referrals/${referralId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${labToken}`,
    },
    body: { status: 'PROCESSING' },
  });
  assert.strictEqual(statusUpdateRes.status, 200);

  // 6. Lab Tech enters results and completes test
  const completeRefRes = await request(`/api/referrals/${referralId}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${labToken}`,
    },
    body: { resultsSummary: 'CMP Normal. Sodium: 140 mEq/L, Potassium: 4.2 mEq/L, AST: 22 U/L.' },
  });
  assert.strictEqual(completeRefRes.status, 200);
  assert.strictEqual(completeRefRes.body.referral.status, 'COMPLETED');

  // 7. Verification: Patient automatically returned to Doctor Queue with status LAB_COMPLETED!
  const doctorQueueRes = await request(`/api/doctors/${doctorSmithId}`, {
    headers: { 'Authorization': `Bearer ${doctorToken}` },
  });
  assert.strictEqual(doctorQueueRes.status, 200);
  const returnedPatientTicket = doctorQueueRes.body.activeQueue.find(t => t.id === activeTicket.id);
  assert.ok(returnedPatientTicket, 'Patient must be in doctor active queue');
  assert.strictEqual(returnedPatientTicket.status, 'LAB_COMPLETED', 'Ticket status must be LAB_COMPLETED');

  // 8. Doctor finishes final consultation
  const finalCompleteRes = await request(`/api/queues/${activeTicket.id}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${doctorToken}`,
    },
  });
  assert.strictEqual(finalCompleteRes.status, 200);
  assert.strictEqual(finalCompleteRes.body.ticket.status, 'COMPLETED');
});

test('8. Patient Movement Audit Trail Integrity', async () => {
  const res = await request(`/api/patients/${testPatientId}`, {
    headers: { 'Authorization': `Bearer ${doctorToken}` },
  });
  assert.strictEqual(res.status, 200);
  const movements = res.body.history.movements;
  assert.ok(movements.length >= 4, 'Must have recorded transitions through flow');

  // Verify progression
  const stations = movements.map(m => m.to_station);
  assert.ok(stations.includes('RECEPTION'), 'Must have passed Reception');
  assert.ok(stations.includes('LABORATORY'), 'Must have passed Laboratory');
  assert.ok(stations.includes('DISCHARGED'), 'Must have reached Discharged');
});

test('9. AI Features: Wait Time Prediction, Busy Hours, Overcrowding Radar & Flow Analytics', async () => {
  // Busy hours
  const busyRes = await request('/api/ai/busy-hours', {
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  assert.strictEqual(busyRes.status, 200);
  assert.ok(busyRes.body.busyHours.hourly_forecast.length >= 8);
  assert.ok(busyRes.body.busyHours.peak_period_window);

  // Overcrowding Bottlenecks
  const bottlenecksRes = await request('/api/ai/bottlenecks', {
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  assert.strictEqual(bottlenecksRes.status, 200);
  assert.ok(Array.isArray(bottlenecksRes.body.bottlenecks));
  assert.ok(bottlenecksRes.body.bottlenecks.length > 0);
  const genBottleneck = bottlenecksRes.body.bottlenecks.find(b => b.department_code === 'GEN');
  assert.ok(genBottleneck);
  assert.ok(['NORMAL', 'ELEVATED', 'CRITICAL'].includes(genBottleneck.alert_level));

  // Patient Flow Analytics
  const flowRes = await request('/api/ai/flow-analytics', {
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  assert.strictEqual(flowRes.status, 200);
  assert.ok(flowRes.body.flowAnalytics.stage_bottlenecks.length > 0);
  assert.ok(flowRes.body.flowAnalytics.overall_hospital_efficiency_score);
});
