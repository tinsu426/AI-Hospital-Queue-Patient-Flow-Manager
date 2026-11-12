import React, { useState, useEffect } from 'react';
import { queueService, departmentService } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import PriorityBadge from '../../components/common/PriorityBadge';
import StatusBadge from '../../components/common/StatusBadge';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  Filter,
  CheckCircle2,
  TrendingUp,
  User,
  HeartPulse,
  Activity,
  AlertCircle
} from 'lucide-react';

export default function TriageDashboard() {
  const { socket } = useSocket();
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('ALL');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    loadDepartments();
    loadQueues();
  }, []);

  // Real-time synchronization
  useEffect(() => {
    if (!socket) return;

    socket.on('queue:ticket-created', () => loadQueues());
    socket.on('queue:priority-escalated', () => loadQueues());
    socket.on('queue:status-updated', () => loadQueues());

    return () => {
      socket.off('queue:ticket-created');
      socket.off('queue:priority-escalated');
      socket.off('queue:status-updated');
    };
  }, [socket, selectedDeptId]);

  const loadDepartments = async () => {
    try {
      const res = await departmentService.getAll();
      if (res.success) setDepartments(res.departments);
    } catch (err) {
      console.error(err);
    }
  };

  const loadQueues = async () => {
    setLoading(true);
    try {
      if (selectedDeptId === 'ALL') {
        const res = await queueService.getActive();
        if (res.success) setTickets(res.tickets);
      } else {
        const res = await queueService.getByDepartment(selectedDeptId);
        if (res.success) setTickets(res.tickets);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEscalatePriority = async (ticketId, ticketNumber, newPriority) => {
    try {
      const res = await queueService.updatePriority(ticketId, newPriority);
      if (res.success) {
        setFeedback({
          text: `Ticket ${ticketNumber} escalated to ${newPriority}! Priority reordering broadcasted.`,
          type: newPriority === 'EMERGENCY' ? 'red' : 'amber',
        });
        setTimeout(() => setFeedback(null), 4000);
        loadQueues();
      }
    } catch (err) {
      alert(err.message || 'Error updating priority');
    }
  };

  const filteredTickets = selectedDeptId === 'ALL'
    ? tickets
    : tickets.filter(t => t.department_id === selectedDeptId);

  // Metrics
  const emergencyCount = filteredTickets.filter(t => t.priority === 'EMERGENCY').length;
  const urgentCount = filteredTickets.filter(t => t.priority === 'URGENT').length;
  const waitingCount = filteredTickets.filter(t => t.status === 'WAITING').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-800">🩺</span>
            Nurse Clinical Triage Station
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Clinical acuity assessment, emergency priority preemption, and queue pressure monitor.
          </p>
        </div>

        {/* Priority Counters */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{emergencyCount} Emergency</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>{urgentCount} Urgent</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>{waitingCount} Waiting</span>
          </div>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
          feedback.type === 'red' ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'bg-amber-500 text-white shadow-lg'
        }`}>
          <AlertCircle className="w-5 h-5" />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Department Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => { setSelectedDeptId('ALL'); loadQueues(); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            selectedDeptId === 'ALL'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Filter className="w-3.5 h-3.5" /> All Departments
        </button>
        {departments.map(d => (
          <button
            key={d.id}
            onClick={() => { setSelectedDeptId(d.id); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              selectedDeptId === d.id
                ? 'bg-hospital-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {d.name} ({d.code})
          </button>
        ))}
      </div>

      {/* Triage Queue Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <span className="font-bold text-sm text-slate-700">
            Acuity Ordered Queue (Emergency priority automatically placed ahead)
          </span>
          <span className="text-xs text-slate-500">
            {filteredTickets.length} Patients in view
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredTickets.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No patients waiting in this department queue.
            </div>
          ) : (
            filteredTickets.map((t, index) => (
              <div
                key={t.id}
                className={`p-4 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  t.priority === 'EMERGENCY' ? 'bg-red-50/60' : t.priority === 'URGENT' ? 'bg-amber-50/30' : 'hover:bg-slate-50'
                }`}
              >
                {/* Left: Position & Ticket Info */}
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                    t.priority === 'EMERGENCY'
                      ? 'bg-red-600 text-white shadow-md animate-pulse'
                      : t.priority === 'URGENT'
                      ? 'bg-amber-500 text-white shadow'
                      : 'bg-hospital-600 text-white'
                  }`}>
                    #{index + 1}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-base text-slate-900">{t.ticket_number}</span>
                      <span className="text-xs font-bold text-slate-700">
                        {t.first_name} {t.last_name}
                      </span>
                      <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {t.patient_id_display}
                      </span>
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800">
                        {t.blood_group || 'O+'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                      <span>Dept: <b>{t.department_name}</b></span>
                      <span>•</span>
                      <span>Est. Wait: ~<b>{t.estimated_wait_minutes || 10} mins</b></span>
                      {t.notes && (
                        <>
                          <span>•</span>
                          <span className="italic text-slate-600">"{t.notes}"</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Acuity Actions (Change Priority) */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  <StatusBadge status={t.status} />

                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-[10px] font-bold uppercase text-slate-400 px-1.5">Triage:</span>
                    <button
                      onClick={() => handleEscalatePriority(t.id, t.ticket_number, 'NORMAL')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                        t.priority === 'NORMAL'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Normal
                    </button>
                    <button
                      onClick={() => handleEscalatePriority(t.id, t.ticket_number, 'URGENT')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                        t.priority === 'URGENT'
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Urgent
                    </button>
                    <button
                      onClick={() => handleEscalatePriority(t.id, t.ticket_number, 'EMERGENCY')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                        t.priority === 'EMERGENCY'
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                    >
                      Emergency
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
