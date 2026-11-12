import React, { useState, useEffect } from 'react';
import { patientService, departmentService, queueService } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import PriorityBadge from '../../components/common/PriorityBadge';
import StatusBadge from '../../components/common/StatusBadge';
import {
  Search,
  UserPlus,
  Ticket,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Phone,
  Calendar,
  X,
  History,
  Activity,
  ArrowRight
} from 'lucide-react';

export default function ReceptionistDashboard() {
  const { socket } = useSocket();
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [departments, setDepartments] = useState([]);
  const [activeQueues, setActiveQueues] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showIssueTicketModal, setShowIssueTicketModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState(null);

  // New Patient Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '1995-06-15',
    gender: 'Female',
    phone: '+1-555-0155',
    emergencyContactName: 'Next of Kin',
    emergencyContactPhone: '+1-555-0156',
    bloodGroup: 'O+',
    allergies: '',
    medicalNotes: '',
  });

  // Ticket Form State
  const [ticketData, setTicketData] = useState({
    departmentId: '',
    priority: 'NORMAL',
    notes: '',
  });

  // Success Feedback Banner
  const [latestTicket, setLatestTicket] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Listen to Socket.IO live queue creations and status updates
  useEffect(() => {
    if (!socket) return;

    socket.on('queue:ticket-created', () => {
      fetchActiveQueues();
    });

    socket.on('queue:status-updated', () => {
      fetchActiveQueues();
    });

    return () => {
      socket.off('queue:ticket-created');
      socket.off('queue:status-updated');
    };
  }, [socket]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [deptRes, patRes, qRes] = await Promise.all([
        departmentService.getAll(),
        patientService.search(''),
        queueService.getActive(),
      ]);

      if (deptRes.success) {
        setDepartments(deptRes.departments);
        if (deptRes.departments.length > 0) {
          setTicketData(prev => ({ ...prev, departmentId: deptRes.departments[0].id }));
        }
      }
      if (patRes.success) setPatients(patRes.patients);
      if (qRes.success) setActiveQueues(qRes.tickets);
    } catch (err) {
      console.error('Failed to load reception data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveQueues = async () => {
    try {
      const qRes = await queueService.getActive();
      if (qRes.success) setActiveQueues(qRes.tickets);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const res = await patientService.search(searchQuery);
      if (res.success) setPatients(res.patients);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    try {
      const res = await patientService.register(formData);
      if (res.success) {
        setShowRegisterModal(false);
        // Refresh patient list
        const updated = await patientService.search('');
        if (updated.success) setPatients(updated.patients);
        // Automatically open Issue Ticket modal for this newly registered patient!
        handleOpenIssueTicket(res.patient);
      }
    } catch (err) {
      alert(err.message || 'Error registering patient');
    }
  };

  const handleOpenIssueTicket = (patient) => {
    setSelectedPatient(patient);
    setShowIssueTicketModal(true);
  };

  const handleIssueTicket = async (e) => {
    e.preventDefault();
    if (!selectedPatient || !ticketData.departmentId) return;

    try {
      const res = await queueService.issueTicket({
        patientId: selectedPatient.id,
        departmentId: ticketData.departmentId,
        priority: ticketData.priority,
        notes: ticketData.notes,
      });

      if (res.success) {
        setLatestTicket(res.ticket);
        setShowIssueTicketModal(false);
        fetchActiveQueues();
      }
    } catch (err) {
      alert(err.message || 'Error issuing ticket');
    }
  };

  const handleViewHistory = async (patient) => {
    try {
      setSelectedPatient(patient);
      const res = await patientService.getById(patient.id);
      if (res.success) {
        setPatientHistory(res.history);
        setShowHistoryModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800"></span>
            Reception & Patient Intake Desk
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Search patient records, register arrivals, and assign department queue numbers.
          </p>
        </div>

        <button
          onClick={() => setShowRegisterModal(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition"
        >
          <UserPlus className="w-4 h-4" /> Register New Patient
        </button>
      </div>

      {/* Ticket Success Confirmation Banner */}
      {latestTicket && (
        <div className="p-5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center font-black text-2xl tracking-wider">
              {latestTicket.ticket_number}
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                Ticket Successfully Issued!
              </div>
              <div className="text-lg font-extrabold">
                {latestTicket.first_name} {latestTicket.last_name} ({latestTicket.patient_id_display})
              </div>
              <div className="text-xs text-white/90">
                Department: <b>{latestTicket.department_name}</b> | Estimated Wait: ~<b>{latestTicket.estimated_wait_minutes || 15} mins</b>
              </div>
            </div>
          </div>
          <button
            onClick={() => setLatestTicket(null)}
            className="px-4 py-2 bg-white text-emerald-800 font-bold text-xs rounded-xl shadow hover:bg-emerald-50 transition"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Two Column Layout: Patient Search & Today's Active Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Patient Registry & Search (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <Search className="w-4 h-4 text-hospital-600" /> Patient Search Directory
              </h2>
              <span className="text-xs text-slate-500">Showing {patients.length} records</span>
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearch} className="flex gap-2 mb-6">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by ID (PAT-...), Name, or Phone..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hospital-500 focus:bg-white"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-hospital-600 hover:bg-hospital-700 text-white rounded-xl text-sm font-semibold transition"
              >
                Search
              </button>
            </form>

            {/* Patients List */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {patients.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No matching patients found. Click "Register New Patient" to add.
                </div>
              ) : (
                patients.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-hospital-300 hover:bg-hospital-50/40 transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">
                          {p.first_name} {p.last_name}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {p.patient_id_display}
                        </span>
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                          {p.blood_group || 'N/A'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {p.phone}
                        </span>
                        <span>•</span>
                        <span>{p.gender}, DOB: {p.date_of_birth}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleViewHistory(p)}
                        className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center justify-center gap-1"
                        title="View clinical history"
                      >
                        <History className="w-3.5 h-3.5" /> History
                      </button>
                      <button
                        onClick={() => handleOpenIssueTicket(p)}
                        className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold text-white bg-hospital-600 hover:bg-hospital-700 rounded-lg shadow-sm transition flex items-center justify-center gap-1"
                      >
                        <Ticket className="w-3.5 h-3.5" /> Issue Ticket
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Active Queues Monitor (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-hospital-600" /> Active Hospital Queues
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-hospital-100 text-hospital-800">
                {activeQueues.length} Active
              </span>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {activeQueues.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No patients currently in queue.
                </div>
              ) : (
                activeQueues.map((q) => (
                  <div
                    key={q.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white transition flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-12 h-10 rounded-lg bg-hospital-700 text-white font-black text-sm flex items-center justify-center shadow-sm">
                        {q.ticket_number}
                      </span>
                      <div>
                        <div className="font-bold text-xs text-slate-800">
                          {q.first_name} {q.last_name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {q.department_name} • {q.room_number || 'Waiting Room'}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <PriorityBadge priority={q.priority} size="sm" />
                      <StatusBadge status={q.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: REGISTER NEW PATIENT */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" /> Register New Patient
              </h3>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterPatient} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Contact Phone</label>
                  <input
                    type="tel"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Known Allergies</label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Latex, Peanuts"
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Intake Medical Notes</label>
                <textarea
                  rows="2"
                  placeholder="Primary complaint, symptoms reported at reception..."
                  value={formData.medicalNotes}
                  onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow"
                >
                  Save & Issue Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ISSUE QUEUE TICKET */}
      {showIssueTicketModal && selectedPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-hospital-600" /> Issue Department Ticket
              </h3>
              <button
                onClick={() => setShowIssueTicketModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl mb-4 border border-slate-200">
              <div className="text-xs text-slate-500 font-semibold uppercase">Patient</div>
              <div className="text-sm font-extrabold text-slate-900">
                {selectedPatient.first_name} {selectedPatient.last_name}
              </div>
              <div className="text-xs text-slate-600">ID: {selectedPatient.patient_id_display}</div>
            </div>

            <form onSubmit={handleIssueTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Department *</label>
                <select
                  value={ticketData.departmentId}
                  onChange={(e) => setTicketData({ ...ticketData, departmentId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code}) - Avg ~{d.average_service_time_minutes}m
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Initial Priority Grade</label>
                <div className="grid grid-cols-3 gap-2">
                  {['NORMAL', 'URGENT', 'EMERGENCY'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setTicketData({ ...ticketData, priority: p })}
                      className={`py-2 rounded-lg text-xs font-bold uppercase transition border ${
                        ticketData.priority === p
                          ? p === 'EMERGENCY'
                            ? 'bg-red-600 text-white border-red-600 shadow'
                            : p === 'URGENT'
                            ? 'bg-amber-500 text-white border-amber-500 shadow'
                            : 'bg-emerald-600 text-white border-emerald-600 shadow'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Arrival Reason / Notes</label>
                <textarea
                  rows="2"
                  placeholder="Routine checkup, headache, triage guidance..."
                  value={ticketData.notes}
                  onChange={(e) => setTicketData({ ...ticketData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIssueTicketModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-hospital-600 hover:bg-hospital-700 text-white rounded-lg text-sm font-bold shadow"
                >
                  Generate Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PATIENT HISTORY & VISITS */}
      {showHistoryModal && selectedPatient && patientHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedPatient.first_name} {selectedPatient.last_name}
                </h3>
                <p className="text-xs text-slate-500">ID: {selectedPatient.patient_id_display} • Phone: {selectedPatient.phone}</p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Visit Tickets */}
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Queue Tickets & Visits</h4>
                {patientHistory.tickets.length === 0 ? (
                  <p className="text-xs text-slate-400">No visits recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {patientHistory.tickets.map(t => (
                      <div key={t.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs flex justify-between items-center">
                        <div>
                          <div className="font-bold text-slate-800">{t.ticket_number} — {t.department_name}</div>
                          <div className="text-slate-500">Doctor: {t.doctor_name || 'Unassigned'} • Room: {t.room_number || 'TBD'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <PriorityBadge priority={t.priority} />
                          <StatusBadge status={t.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Lab Referrals */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Laboratory Orders</h4>
                {patientHistory.referrals.length === 0 ? (
                  <p className="text-xs text-slate-400">No laboratory tests requested.</p>
                ) : (
                  <div className="space-y-2">
                    {patientHistory.referrals.map(r => (
                      <div key={r.id} className="p-3 rounded-xl border border-purple-200 bg-purple-50/50 text-xs">
                        <div className="flex justify-between items-center font-bold text-purple-900">
                          <span>{r.test_type}</span>
                          <span className="uppercase text-[10px] px-2 py-0.5 rounded bg-purple-200 text-purple-800">{r.status}</span>
                        </div>
                        <div className="text-purple-700 mt-1">Requested by: {r.doctor_name} ({r.room_number})</div>
                        {r.results_summary && (
                          <div className="mt-2 p-2 bg-white rounded border border-purple-100 text-slate-800 font-medium">
                            <b>Result:</b> {r.results_summary}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Patient Movements Trail */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Patient Movement Audit Trail</h4>
                <div className="space-y-1.5 border-l-2 border-slate-300 pl-3">
                  {patientHistory.movements.map((m, idx) => (
                    <div key={m.id || idx} className="text-xs text-slate-600">
                      <span className="font-bold text-slate-900">{m.from_station} ➔ {m.to_station}</span>: {m.status}
                      {m.notes && <span className="text-slate-500"> ({m.notes})</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
