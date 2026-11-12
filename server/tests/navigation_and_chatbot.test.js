const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const db = require('../src/config/db');
const { app, server } = require('../src/server');

const PORT = 5003;
const BASE_URL = `http://localhost:${PORT}`;

let testServer;
let adminToken = '';
let staffToken = '';

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

  const adminLogin = await apiCall('/api/auth/login', 'POST', { username: 'admin', password: 'Admin@123' });
  adminToken = adminLogin.body.token;

  const staffLogin = await apiCall('/api/auth/login', 'POST', { username: 'receptionist1', password: 'Staff@123' });
  staffToken = staffLogin.body.token;
});

test.after(async () => {
  await new Promise((resolve) => testServer.close(() => resolve()));
  await db.pool.end();
});

test('PHASE 17: Hospital Navigation Directory & Route Planning', async () => {
  // 1. Directory
  const dirRes = await apiCall('/api/navigation/directory');
  assert.strictEqual(dirRes.status, 200);
  assert.ok(dirRes.body.departments.length >= 5);
  const labDept = dirRes.body.departments.find(d => d.code === 'LAB');
  assert.ok(labDept);
  assert.strictEqual(labDept.floor_number, 2);
  assert.strictEqual(labDept.room_number, 'Room 208');

  // 2. Cross-floor Route: Reception (Floor 1) to Laboratory (Floor 2)
  const routeRes = await apiCall('/api/navigation/route?from=RECEPTION_F1&to=LAB');
  assert.strictEqual(routeRes.status, 200);
  assert.strictEqual(routeRes.body.route.is_cross_floor, true);
  assert.ok(routeRes.body.route.steps.length >= 4);
  assert.ok(routeRes.body.route.waypoints.length >= 3);
  assert.ok(routeRes.body.route.estimated_walk_minutes >= 1);

  // 3. Same-floor Route: Reception (Floor 1) to Emergency Bay (Floor 1)
  const emerRouteRes = await apiCall('/api/navigation/route?from=RECEPTION_F1&to=EMER');
  assert.strictEqual(emerRouteRes.status, 200);
  assert.strictEqual(emerRouteRes.body.route.is_cross_floor, false);
});

test('PHASE 16: AI Hospital Assistant Chatbot with Live System Grounding', async () => {
  // 1. Live statistics query
  const statsRes = await apiCall('/api/chatbot/message', 'POST', {
    message: 'How many patients are waiting right now?',
  }, adminToken);
  assert.strictEqual(statsRes.status, 200);
  assert.ok(statsRes.body.data.reply.includes('waiting'));
  assert.ok(statsRes.body.data.systemStats !== undefined);

  // 2. Operational procedure guidance: Adding a doctor
  const docGuideRes = await apiCall('/api/chatbot/message', 'POST', {
    message: 'How do I add a doctor to the hospital system?',
  }, adminToken);
  assert.strictEqual(docGuideRes.status, 200);
  assert.ok(docGuideRes.body.data.reply.includes('Admin'));
  assert.ok(docGuideRes.body.data.quickLinks.some(l => l.tab === 'admin'));

  // 3. Navigation integration in chatbot: "Where is the laboratory?"
  const navChatRes = await apiCall('/api/chatbot/message', 'POST', {
    message: 'Where is the laboratory located?',
  }, staffToken);
  assert.strictEqual(navChatRes.status, 200);
  assert.ok(navChatRes.body.data.reply.includes('Floor 2'));
  assert.ok(navChatRes.body.data.reply.includes('Room 208'));
  assert.strictEqual(navChatRes.body.data.navigationTarget.code, 'LAB');

  // 4. Clinical safety guardrail: Rejection of diagnostic request
  const medSafetyRes = await apiCall('/api/chatbot/message', 'POST', {
    message: 'I have severe chest pain and dizziness, what medicine should I take?',
  }, staffToken);
  assert.strictEqual(medSafetyRes.status, 200);
  assert.ok(medSafetyRes.body.data.reply.includes('Clinical Safety Notice'));
  assert.ok(medSafetyRes.body.data.quickLinks.some(l => l.tab === 'triage'));
});

test('PHASE 18: System Settings for Assistant and Voice Announcements', async () => {
  // 1. Get settings
  const settingsRes = await apiCall('/api/settings');
  assert.strictEqual(settingsRes.status, 200);
  assert.ok(settingsRes.body.settings.assistant_config);
  assert.ok(settingsRes.body.settings.voice_announcements);

  // 2. Admin update voice announcements configuration
  const updateRes = await apiCall('/api/settings/voice_announcements', 'PUT', {
    value: {
      enabled: true,
      privacy_mode: 'FIRST_NAME_AND_TICKET',
      language: 'en-US',
      chime_enabled: true,
    },
  }, adminToken);
  assert.strictEqual(updateRes.status, 200);
});
