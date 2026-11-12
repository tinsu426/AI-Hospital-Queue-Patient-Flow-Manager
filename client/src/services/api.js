// Base Fetch Wrapper with JWT Token Injection
const API_BASE = '/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// API Service Modules
export const authService = {
  login: (username, password) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }),
  getMe: () => apiRequest('/auth/me'),
  registerStaff: (userData) => apiRequest('/auth/register-staff', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
};

export const patientService = {
  search: (query) => apiRequest(`/patients${query ? `?query=${encodeURIComponent(query)}` : ''}`),
  getById: (id) => apiRequest(`/patients/${id}`),
  register: (patientData) => apiRequest('/patients', {
    method: 'POST',
    body: JSON.stringify(patientData),
  }),
  update: (id, patientData) => apiRequest(`/patients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(patientData),
  }),
};

export const doctorService = {
  getAll: (params = {}) => {
    const search = new URLSearchParams(params).toString();
    return apiRequest(`/doctors${search ? `?${search}` : ''}`);
  },
  getById: (id) => apiRequest(`/doctors/${id}`),
  updateStatus: (id, status) => apiRequest(`/doctors/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
  updateSchedules: (id, schedules) => apiRequest(`/doctors/${id}/schedules`, {
    method: 'POST',
    body: JSON.stringify({ schedules }),
  }),
  assignPatient: (doctorId, ticketId) => apiRequest(`/doctors/${doctorId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ ticketId }),
  }),
};

export const queueService = {
  getActive: () => apiRequest('/queues/active'),
  getByDepartment: (deptId) => apiRequest(`/queues/department/${deptId}`),
  issueTicket: (ticketData) => apiRequest('/queues/ticket', {
    method: 'POST',
    body: JSON.stringify(ticketData),
  }),
  updatePriority: (ticketId, priority) => apiRequest(`/queues/${ticketId}/priority`, {
    method: 'PATCH',
    body: JSON.stringify({ priority }),
  }),
  callTicket: (ticketId, doctorId, roomNumber) => apiRequest(`/queues/${ticketId}/call`, {
    method: 'POST',
    body: JSON.stringify({ doctorId, roomNumber }),
  }),
  startServing: (ticketId, doctorId) => apiRequest(`/queues/${ticketId}/start-serving`, {
    method: 'POST',
    body: JSON.stringify({ doctorId }),
  }),
  completeTicket: (ticketId) => apiRequest(`/queues/${ticketId}/complete`, {
    method: 'POST',
  }),
  getBillboardFeed: () => apiRequest('/queues/billboard'),
};

export const referralService = {
  create: (referralData) => apiRequest('/referrals', {
    method: 'POST',
    body: JSON.stringify(referralData),
  }),
  getLabWorkbench: () => apiRequest('/referrals/lab'),
  getDoctorReferrals: (doctorId) => apiRequest(`/referrals/doctor/${doctorId}`),
  updateStatus: (id, status) => apiRequest(`/referrals/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
  complete: (id, resultsSummary) => apiRequest(`/referrals/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify({ resultsSummary }),
  }),
};

export const aiService = {
  predictWait: (ticketId) => apiRequest(`/ai/predict-wait/${ticketId}`),
  getBusyHours: () => apiRequest('/ai/busy-hours'),
  getBottlenecks: () => apiRequest('/ai/bottlenecks'),
  getFlowAnalytics: () => apiRequest('/ai/flow-analytics'),
};

export const departmentService = {
  getAll: () => apiRequest('/departments'),
  getById: (id) => apiRequest(`/departments/${id}`),
};

export const navigationService = {
  getDirectory: () => apiRequest('/navigation/directory'),
  getWaypoints: (floor) => apiRequest(`/navigation/waypoints${floor ? `?floor=${floor}` : ''}`),
  getRoute: (from, to) => apiRequest(`/navigation/route?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  updateLocation: (id, data) => apiRequest(`/navigation/department/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};

export const chatbotService = {
  sendMessage: (message) => apiRequest('/chatbot/message', {
    method: 'POST',
    body: JSON.stringify({ message }),
  }),
  getSuggestions: () => apiRequest('/chatbot/suggestions'),
};

export const settingsService = {
  getAll: () => apiRequest('/settings'),
  update: (key, value) => apiRequest(`/settings/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  }),
};
