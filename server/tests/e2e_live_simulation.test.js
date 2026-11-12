const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const ioClient = require('socket.io-client');
const db = require('../src/config/db');
const { app, server } = require('../src/server');

const PORT = 5002;
const BASE_URL = `http://localhost:${PORT}`;

let testServer;
let billboardSocket;
let doctorSocket;
let labSocket;

let doctorToken = '';
let receptionistToken = '';
let labToken = '';
let doctorSmithId = '';
let genDeptId = '';
let patientId = '';

function apiCall(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

test.before(async () => {
  await new Promise((resolve) => {
    testServer = server.listen(PORT, () => resolve());
  });

  // Log in staff
  const docLogin = await apiCall('/api/auth/login', 'POST', { username: 'dr.smith', password: 'Doctor@123' });
  doctorToken = docLogin.body.token;
  doctorSmithId = docLogin.body.user.doctor.id;

  const recLogin = await apiCall('/api/auth/login', 'POST', { username: 'receptionist1', password: 'Staff@123' });
  receptionistToken = recLogin.body.token;

  const labLogin = await apiCall('/api/auth/login', 'POST', { username: 'labtech1', password: 'Staff@123' });
  labToken = labLogin.body.token;

  const dRes = await db.query("SELECT id FROM departments WHERE code = 'GEN'");
  genDeptId = dRes.rows[0].id;

  // Register synthetic patient
  const pRes = await apiCall('/api/patients', 'POST', {
    firstName: 'Realtime',
    lastName: 'E2ETester',
    dateOfBirth: '1998-12-01',
    gender: 'Male',
    phone: '+1-555-7777',
  }, receptionistToken);
  patientId = pRes.body.patient.id;

  // Connect live Socket.IO clients
  billboardSocket = ioClient(BASE_URL, { transports: ['websocket'] });
  doctorSocket = ioClient(BASE_URL, { transports: ['websocket'] });
  labSocket = ioClient(BASE_URL, { transports: ['websocket'] });

  await new Promise((resolve) => {
    let connected = 0;
    const check = () => {
      connected++;
      if (connected === 3) resolve();
    };
    billboardSocket.on('connect', () => {
      billboardSocket.emit('join:billboard');
      check();
    });
    doctorSocket.on('connect', () => {
      doctorSocket.emit('join:doctor', doctorSmithId);
      check();
    });
    labSocket.on('connect', () => {
      labSocket.emit('join:lab');
      check();
    });
  });
});

test.after(async () => {
  billboardSocket.disconnect();
  doctorSocket.disconnect();
  labSocket.disconnect();
  await new Promise((resolve) => testServer.close(() => resolve()));
  await db.pool.end();
});

test('LIVE E2E: Real-Time Socket Event Delivery across TV Billboard, Doctor Desk, and Lab Workbench', async () => {
  let ticketId = '';
  let ticketNumber = '';

  // 1. Reception issues ticket -> TV Billboard receives live socket notification
  const ticketPromise = new Promise((resolve) => {
    billboardSocket.once('queue:ticket-created', (payload) => {
      resolve(payload);
    });
  });

  const issueRes = await apiCall('/api/queues/ticket', 'POST', {
    patientId,
    departmentId: genDeptId,
    priority: 'NORMAL',
    notes: 'Live Socket E2E Checkup',
  }, receptionistToken);

  assert.strictEqual(issueRes.status, 201);
  ticketId = issueRes.body.ticket.id;
  ticketNumber = issueRes.body.ticket.ticket_number;

  const billboardPayload = await ticketPromise;
  assert.strictEqual(billboardPayload.ticket_number, ticketNumber);

  // 2. Doctor calls ticket -> TV Billboard receives live 'queue:ticket-called' event
  const callPromise = new Promise((resolve) => {
    billboardSocket.once('queue:ticket-called', (payload) => {
      resolve(payload);
    });
  });

  const callRes = await apiCall(`/api/queues/${ticketId}/call`, 'POST', {
    doctorId: doctorSmithId,
    roomNumber: 'Room 101',
  }, doctorToken);
  assert.strictEqual(callRes.status, 200);

  const callPayload = await callPromise;
  assert.strictEqual(callPayload.ticket_number, ticketNumber);
  assert.strictEqual(callPayload.room_number, 'Room 101');

  // 3. Doctor starts consultation -> server sets status SERVING
  const startRes = await apiCall(`/api/queues/${ticketId}/start-serving`, 'POST', {
    doctorId: doctorSmithId,
  }, doctorToken);
  assert.strictEqual(startRes.status, 200);
  assert.strictEqual(startRes.body.ticket.status, 'SERVING');

  // 4. Doctor refers patient to laboratory -> Lab Socket receives 'referral:created'
  const labReferralPromise = new Promise((resolve) => {
    labSocket.once('referral:created', (payload) => {
      resolve(payload);
    });
  });

  const refRes = await apiCall('/api/referrals', 'POST', {
    patientId,
    referringDoctorId: doctorSmithId,
    sourceQueueTicketId: ticketId,
    testType: 'Cardiac Enzymes Panel',
    priority: 'URGENT',
    clinicalNotes: 'Check troponin levels',
  }, doctorToken);
  assert.strictEqual(refRes.status, 201);

  const referralData = await labReferralPromise;
  assert.strictEqual(referralData.test_type, 'Cardiac Enzymes Panel');
  assert.strictEqual(referralData.priority, 'URGENT');
  const referralId = referralData.id;

  // 5. Lab Tech completes results -> Doctor Socket receives direct 'referral:completed'
  const docReturnPromise = new Promise((resolve) => {
    doctorSocket.once('referral:completed', (payload) => {
      resolve(payload);
    });
  });

  const completeLabRes = await apiCall(`/api/referrals/${referralId}/complete`, 'POST', {
    resultsSummary: 'Troponin-I negative (<0.01 ng/mL). Normal myocardium markers.',
  }, labToken);
  assert.strictEqual(completeLabRes.status, 200);

  const completedReferralPayload = await docReturnPromise;
  assert.strictEqual(completedReferralPayload.id, referralId);
  assert.strictEqual(completedReferralPayload.results_summary, 'Troponin-I negative (<0.01 ng/mL). Normal myocardium markers.');

  // 6. Doctor finishes consultation and discharges patient
  const finishRes = await apiCall(`/api/queues/${ticketId}/complete`, 'POST', {}, doctorToken);
  assert.strictEqual(finishRes.status, 200);
  assert.strictEqual(finishRes.body.ticket.status, 'COMPLETED');
});
