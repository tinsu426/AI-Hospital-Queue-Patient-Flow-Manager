import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { doctorService, queueService, referralService } from '../../services/api';
import PriorityBadge from '../../components/common/PriorityBadge';
import StatusBadge from '../../components/common/StatusBadge';
import {
  Stethoscope,
  PhoneCall,
  Play,
  CheckCircle,
  FlaskConical,
  Clock,
  User,
  Coffee,
  AlertCircle,
  Sparkles,
  FileText,
  X,
  BellRing,
  Volume2,
  ArrowRight
} from 'lucide-react';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();

  const doctorId = user?.doctor?.id;
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [activeQueue, setActiveQueue] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(false);

  // Doctor Availability Status
  const [currentStatus, setCurrentStatus] = useState(user?.doctor?.status || 'AVAILABLE');

  // Currently Serving Patient
  const [activePatient, setActivePatient] = useState(null);

  // Modals
  const [showLabModal, setShowLabModal] = useState(false);
  const [labFormData, setLabFormData] = useState({
    testType: 'Complete Blood Count (CBC) with Differential',
    priority: 'NORMAL',
    clinicalNotes: '',
  });

  // Incoming Lab Result Notification Toast
  const [incomingResultAlert, setIncomingResultAlert] = useState(null);

  useEffect(() => {
    if (doctorId) {
      loadDoctorData();
    }
  }, [doctorId]);

  // Real-time synchronization
  useEffect(() => {
    if (!socket || !doctorId) return;

    // Join doctor's private channel
    socket.emit('join:doctor', doctorId);

    // When ticket status changes or new ticket created
    socket.on('queue:ticket-created', () => loadDoctorData());
    socket.on('queue:status-updated', () => loadDoctorData());
    socket.on('queue:priority-escalated', () => loadDoctorData());

    // When lab finishes results for this doctor's patient!
    socket.on('referral:completed', (data) => {
      setIncomingResultAlert(data);
      loadDoctorData();
    });

    return () => {
      socket.off('queue:ticket-created');
      socket.off('queue:status-updated');
      socket.off('queue:priority-escalated');
      socket.off('referral:completed');
    };
  }, [socket, doctorId]);

  const loadDoctorData = async () => {
    if (!doctorId) return;
    setLoading(true);
    try {
      const [docRes, refRes] = await Promise.all([
        doctorService.getById(doctorId),
        referralService.getDoctorReferrals(doctorId),
      ]);

      if (docRes.success) {
        setDoctorProfile(docRes.doctor);
        setCurrentStatus(docRes.doctor.status);
        setActiveQueue(docRes.activeQueue || []);

        // Find if someone is currently SERVING or CALLED
        const serving = (docRes.activeQueue || []).find(q => q.status === 'SERVING' || q.status === 'CALLED');
        setActivePatient(serving || null);
      }

      if (refRes.success) {
        setReferrals(refRes.referrals || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      const res = await doctorService.updateStatus(doctorId, newStatus);
      if (res.success) {
        setCurrentStatus(newStatus);
      }
    } catch (err) {
      alert(err.message || 'Error updating status');
    }
  };

  const handleCallPatient = async (ticket) => {
    try {
      const res = await queueService.callTicket(
        ticket.id,
        doctorId,
        doctorProfile?.room_number || user?.doctor?.roomNumber || 'Room 101'
      );
      if (res.success) {
        setActivePatient(res.ticket);
        loadDoctorData();
      }
    } catch (err) {
      alert(err.message || 'Error calling patient');
    }
  };

  const handleStartConsultation = async (ticket) => {
    try {
      const res = await queueService.startServing(ticket.id, doctorId);
      if (res.success) {
        setActivePatient(res.ticket);
        loadDoctorData();
      }
    } catch (err) {
      alert(err.message || 'Error starting consultation');
    }
  };

  const handleCompleteConsultation = async (ticket) => {
    try {
      const res = await queueService.completeTicket(ticket.id);
      if (res.success) {
        setActivePatient(null);
        loadDoctorData();
      }
    } catch (err) {
      alert(err.message || 'Error completing consultation');
    }
  };

  const handleOpenLabModal = (patientTicket) => {
    setActivePatient(patientTicket);
    setShowLabModal(true);
  };

  const handleSubmitLabOrder = async (e) => {
    e.preventDefault();
    if (!activePatient) return;

    try {
      const res = await referralService.create({
        patientId: activePatient.patient_id,
        referringDoctorId: doctorId,
        sourceQueueTicketId: activePatient.id,
        testType: labFormData.testType,
        priority: labFormData.priority,
        clinicalNotes: labFormData.clinicalNotes,
      });

      if (res.success) {
        setShowLabModal(false);
        setLabFormData({
          testType: 'Complete Blood Count (CBC) with Differential',
          priority: 'NORMAL',
          clinicalNotes: '',
        });
        loadDoctorData();
      }
    } catch (err) {
      alert(err.message || 'Error ordering lab test');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner: Doctor Profile & Status Toggles */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-hospital-600 to-hospital-400 text-white flex items-center justify-center font-black text-2xl shadow-md">
            
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {user?.fullName || 'Physician Consultation Desk'}
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-hospital-100 text-hospital-800 border border-hospital-200">
                {doctorProfile?.room_number || user?.doctor?.roomNumber || 'Room 101'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Specialization: <b>{doctorProfile?.specialization || user?.doctor?.specialization || 'General Practice'}</b> • Department: {doctorProfile?.department_name}
            </p>
          </div>
        </div>

        {/* Status Switcher Controls */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <span className="text-xs font-bold text-slate-500 px-2 uppercase tracking-wider">Status:</span>
          <button
            onClick={() => handleUpdateStatus('AVAILABLE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
              currentStatus === 'AVAILABLE'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
            Available
          </button>
          <button
            onClick={() => handleUpdateStatus('BUSY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              currentStatus === 'BUSY'
                ? 'bg-amber-500 text-white shadow'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Busy
          </button>
          <button
            onClick={() => handleUpdateStatus('ON_BREAK')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
              currentStatus === 'ON_BREAK'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" /> Break
          </button>
        </div>
      </div>

      {/* Incoming Lab Result Toast Alert */}
      {incomingResultAlert && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-600 to-hospital-600 text-white shadow-xl flex items-center justify-between gap-4 animate-glow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <BellRing className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-teal-100">
                ⚡ Incoming Laboratory Results Ready!
              </div>
              <div className="font-extrabold text-base">
                Patient returned to your queue with completed test: {incomingResultAlert.test_type}
              </div>
              <div className="text-xs text-white/90">
                Summary: {incomingResultAlert.results_summary}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIncomingResultAlert(null)}
            className="px-4 py-2 bg-white text-teal-800 font-bold text-xs rounded-xl shadow hover:bg-teal-50"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* Main Grid: Active Consultation Workspace & Waiting List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Active Patient Consultation Desk (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="font-bold text-base text-slate-800 flex items-center gap-2 mb-4">
              <Stethoscope className="w-4 h-4 text-hospital-600" /> Active Examination Desk
            </h2>

            {activePatient ? (
              <div className="p-6 rounded-2xl border-2 border-hospital-200 bg-hospital-50/30 space-y-5">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-black text-slate-900 tracking-tight">
                        {activePatient.ticket_number}
                      </span>
                      <PriorityBadge priority={activePatient.priority} size="lg" />
                      <StatusBadge status={activePatient.status} />
                    </div>
                    <div className="text-lg font-bold text-slate-800 mt-2">
                      {activePatient.first_name} {activePatient.last_name}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      Patient ID: {activePatient.patient_id_display} • Gender: {activePatient.gender} • Blood: {activePatient.blood_group}
                    </div>
                  </div>
                </div>

                {/* If patient is returning from lab with completed results */}
                {activePatient.status === 'LAB_COMPLETED' && (
                  <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900">
                    <div className="font-bold text-xs uppercase flex items-center gap-1.5 text-teal-700">
                      <CheckCircle className="w-4 h-4 text-teal-600" /> Laboratory Results Completed
                    </div>
                    <div className="text-sm font-medium mt-1">
                      {activePatient.notes || 'Lab test results returned and ready for review.'}
                    </div>
                  </div>
                )}

                {/* Clinical Actions */}
                <div className="pt-4 border-t border-hospital-200 flex flex-wrap gap-2">
                  {activePatient.status === 'WAITING' && (
                    <button
                      onClick={() => handleCallPatient(activePatient)}
                      className="flex-1 py-3 bg-hospital-600 hover:bg-hospital-700 text-white rounded-xl font-bold text-sm shadow flex items-center justify-center gap-2"
                    >
                      <PhoneCall className="w-4 h-4" /> Call to {doctorProfile?.room_number || 'Room'}
                    </button>
                  )}

                  {activePatient.status === 'CALLED' && (
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={() => handleCallPatient(activePatient)}
                        title="Repeat Voice Call Announcement"
                        className="px-4 py-3 bg-hospital-100 hover:bg-hospital-200 text-hospital-800 rounded-xl font-bold text-sm transition flex items-center justify-center gap-1.5"
                      >
                        <Volume2 className="w-4 h-4" /> Repeat Call
                      </button>
                      <button
                        onClick={() => handleStartConsultation(activePatient)}
                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4" /> Start Consultation
                      </button>
                    </div>
                  )}

                  {(activePatient.status === 'SERVING' || activePatient.status === 'LAB_COMPLETED') && (
                    <>
                      <button
                        onClick={() => handleOpenLabModal(activePatient)}
                        className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm shadow flex items-center justify-center gap-2"
                      >
                        <FlaskConical className="w-4 h-4" /> Order Lab Tests
                      </button>

                      <button
                        onClick={() => handleCompleteConsultation(activePatient)}
                        className="flex-1 py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-sm shadow flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" /> Finish & Discharge
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                <Stethoscope className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-sm">No patient currently in consultation.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Select a waiting patient from the queue on the right and click "Call Patient".
                </p>
              </div>
            )}
          </div>

          {/* Laboratory Orders History for this Doctor */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2 mb-4">
              <FlaskConical className="w-4 h-4 text-purple-600" /> Laboratory Orders & Results Tracking
            </h3>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {referrals.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No laboratory orders dispatched yet today.
                </div>
              ) : (
                referrals.map((r) => (
                  <div
                    key={r.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">
                        {r.first_name} {r.last_name} ({r.patient_id_display})
                      </div>
                      <div className="text-slate-500 font-medium mt-0.5">
                        Test: <b className="text-purple-700">{r.test_type}</b>
                      </div>
                      {r.results_summary && (
                        <div className="text-[11px] text-teal-700 font-semibold mt-1 bg-teal-50 p-1.5 rounded border border-teal-100">
                          Result: {r.results_summary}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                        r.status === 'COMPLETED'
                          ? 'bg-teal-100 text-teal-800 border border-teal-200'
                          : r.status === 'PROCESSING'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-purple-100 text-purple-800 border border-purple-200'
                      }`}>
                        {r.status}
                      </span>
                      <PriorityBadge priority={r.priority} size="sm" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Doctor's Queue / Department Waiting List (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-hospital-600" /> Waiting List ({activeQueue.length})
              </h2>
              <span className="text-xs text-slate-400">Emergency Acuity Ranked</span>
            </div>

            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
              {activeQueue.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  Queue is empty. Great job!
                </div>
              ) : (
                activeQueue.map((ticket, index) => (
                  <div
                    key={ticket.id}
                    className={`p-4 rounded-xl border transition flex flex-col gap-2.5 ${
                      ticket.status === 'LAB_COMPLETED'
                        ? 'border-teal-300 bg-teal-50/50'
                        : ticket.priority === 'EMERGENCY'
                        ? 'border-red-300 bg-red-50/50'
                        : 'border-slate-200 bg-white hover:border-hospital-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-hospital-700 bg-hospital-100 px-2 py-0.5 rounded">
                          {ticket.ticket_number}
                        </span>
                        <span className="font-bold text-xs text-slate-900">
                          {ticket.first_name} {ticket.last_name}
                        </span>
                      </div>
                      <PriorityBadge priority={ticket.priority} size="sm" />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>ID: {ticket.patient_id_display}</span>
                      <StatusBadge status={ticket.status} />
                    </div>

                    {/* Quick Call Action */}
                    <div className="pt-2 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={() => handleCallPatient(ticket)}
                        className="px-3 py-1.5 rounded-lg bg-hospital-600 hover:bg-hospital-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
                      >
                        <PhoneCall className="w-3.5 h-3.5" /> Call Patient
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: ORDER LAB TEST */}
      {showLabModal && activePatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-purple-600" /> Laboratory Referral Order
              </h3>
              <button
                onClick={() => setShowLabModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-purple-50 rounded-xl mb-4 border border-purple-100">
              <div className="text-xs text-purple-700 font-semibold uppercase">Patient Order For</div>
              <div className="text-sm font-extrabold text-purple-950">
                {activePatient.first_name} {activePatient.last_name} ({activePatient.patient_id_display})
              </div>
              <p className="text-xs text-purple-600 mt-0.5">
                Automatically creates linked laboratory ticket. Patient does not need to return to reception!
              </p>
            </div>

            <form onSubmit={handleSubmitLabOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Diagnostic Test *</label>
                <select
                  value={labFormData.testType}
                  onChange={(e) => setLabFormData({ ...labFormData, testType: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold"
                >
                  <option value="Complete Blood Count (CBC) with Differential">Complete Blood Count (CBC) with Differential</option>
                  <option value="Comprehensive Metabolic Panel (CMP)">Comprehensive Metabolic Panel (CMP)</option>
                  <option value="Lipid Profile (Cholesterol & Triglycerides)">Lipid Profile (Cholesterol & Triglycerides)</option>
                  <option value="Urinalysis & Microscopy">Urinalysis & Microscopy</option>
                  <option value="Cardiac Enzymes (Troponin-I, CK-MB)">Cardiac Enzymes (Troponin-I, CK-MB)</option>
                  <option value="Liver Function Test (LFT)">Liver Function Test (LFT)</option>
                  <option value="Serum Electrolytes & Creatinine">Serum Electrolytes & Creatinine</option>
                  <option value="Rapid COVID-19 & Influenza Antigens">Rapid COVID-19 & Influenza Antigens</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Laboratory Priority</label>
                <div className="grid grid-cols-3 gap-2">
                  {['NORMAL', 'URGENT', 'EMERGENCY'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setLabFormData({ ...labFormData, priority: p })}
                      className={`py-2 rounded-lg text-xs font-bold uppercase transition border ${
                        labFormData.priority === p
                          ? p === 'EMERGENCY'
                            ? 'bg-red-600 text-white border-red-600 shadow'
                            : p === 'URGENT'
                            ? 'bg-amber-500 text-white border-amber-500 shadow'
                            : 'bg-purple-600 text-white border-purple-600 shadow'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Clinical Indications & Notes</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Suspected diagnosis, specific parameters to highlight..."
                  value={labFormData.clinicalNotes}
                  onChange={(e) => setLabFormData({ ...labFormData, clinicalNotes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLabModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold shadow"
                >
                  Dispatch to Laboratory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
