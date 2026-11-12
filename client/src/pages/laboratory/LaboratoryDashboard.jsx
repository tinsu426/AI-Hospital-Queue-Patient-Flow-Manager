import React, { useState, useEffect } from 'react';
import { referralService } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import PriorityBadge from '../../components/common/PriorityBadge';
import {
  FlaskConical,
  TestTube,
  CheckCircle2,
  Clock,
  ArrowRight,
  User,
  Activity,
  FileCheck,
  X,
  Stethoscope,
  AlertTriangle
} from 'lucide-react';

export default function LaboratoryDashboard() {
  const { socket } = useSocket();
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(false);

  // Results Entry Modal
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [resultsText, setResultsText] = useState('');
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    loadLabWorkbench();
  }, []);

  // Real-time synchronization
  useEffect(() => {
    if (!socket) return;

    socket.emit('join:lab');

    socket.on('referral:created', () => {
      loadLabWorkbench();
      setFeedback({ text: 'New diagnostic test order received from Doctor!', type: 'purple' });
      setTimeout(() => setFeedback(null), 4000);
    });

    socket.on('referral:status-updated', () => loadLabWorkbench());

    return () => {
      socket.off('referral:created');
      socket.off('referral:status-updated');
    };
  }, [socket]);

  const loadLabWorkbench = async () => {
    setLoading(true);
    try {
      const res = await referralService.getLabWorkbench();
      if (res.success) {
        setReferrals(res.referrals || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (referralId, newStatus) => {
    try {
      const res = await referralService.updateStatus(referralId, newStatus);
      if (res.success) {
        loadLabWorkbench();
      }
    } catch (err) {
      alert(err.message || 'Error updating status');
    }
  };

  const handleOpenResultModal = (referral) => {
    setSelectedReferral(referral);
    // Prepopulate sample normal range text template for convenience
    setResultsText(
      referral.test_type.includes('Blood')
        ? 'WBC: 6.8 x10^3/uL, RBC: 4.8 x10^6/uL, Hemoglobin: 14.5 g/dL, Platelets: 250 x10^3/uL (Normal limits).'
        : 'All targeted biomarker values within normal physiological parameters. No acute abnormalities observed.'
    );
    setShowResultModal(true);
  };

  const handleCompleteTest = async (e) => {
    e.preventDefault();
    if (!selectedReferral || !resultsText.trim()) return;

    try {
      const res = await referralService.complete(selectedReferral.id, resultsText.trim());
      if (res.success) {
        setShowResultModal(false);
        setFeedback({
          text: `Test completed! Patient ${selectedReferral.first_name} ${selectedReferral.last_name} returned to ${selectedReferral.doctor_name}'s queue.`,
          type: 'teal',
        });
        setTimeout(() => setFeedback(null), 5000);
        loadLabWorkbench();
      }
    } catch (err) {
      alert(err.message || 'Error completing test');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-100 text-purple-800">🧪</span>
            Diagnostic Laboratory Workbench
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Specimen intake, pathology processing, result documentation, and seamless return-to-physician routing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-800 text-xs font-extrabold border border-purple-200">
            {referrals.length} Pending Specimen Orders
          </span>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-2 transition text-white shadow-lg ${
          feedback.type === 'teal' ? 'bg-teal-600 shadow-teal-600/30' : 'bg-purple-600 shadow-purple-600/30'
        }`}>
          <CheckCircle2 className="w-5 h-5" />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Laboratory Orders Queue */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <span className="font-bold text-sm text-slate-700">
            Active Laboratory Specimens Queue
          </span>
          <span className="text-xs text-slate-500 font-medium">
            Prioritized by emergency clinical acuity
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {referrals.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              <FlaskConical className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold">All laboratory specimen orders are currently processed.</p>
            </div>
          ) : (
            referrals.map((r) => (
              <div
                key={r.id}
                className={`p-5 transition flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 ${
                  r.priority === 'EMERGENCY' ? 'bg-red-50/40' : 'hover:bg-slate-50'
                }`}
              >
                {/* Left: Lab Ticket & Patient details */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-12 rounded-xl bg-purple-700 text-white flex items-center justify-center font-black text-sm shadow-md">
                    {r.lab_ticket_number || 'LAB'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-base text-slate-900">
                        {r.first_name} {r.last_name}
                      </span>
                      <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                        {r.patient_id_display}
                      </span>
                      <PriorityBadge priority={r.priority} size="sm" />
                    </div>

                    <div className="text-sm font-bold text-purple-900 mt-1 flex items-center gap-2">
                      <TestTube className="w-4 h-4 text-purple-600" />
                      <span>{r.test_type}</span>
                    </div>

                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                      <span>Doctor: <b>{r.doctor_name}</b> ({r.room_number})</span>
                      <span>•</span>
                      <span>Source Ticket: <b>{r.source_ticket_number}</b></span>
                      {r.clinical_notes && (
                        <>
                          <span>•</span>
                          <span className="italic text-slate-600">Note: "{r.clinical_notes}"</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Specimen Progress Actions */}
                <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                    r.status === 'PROCESSING'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-purple-100 text-purple-800 border border-purple-200'
                  }`}>
                    {r.status}
                  </span>

                  {r.status === 'PENDING' && (
                    <button
                      onClick={() => handleUpdateStatus(r.id, 'SAMPLE_COLLECTED')}
                      className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition"
                    >
                      Collect Sample
                    </button>
                  )}

                  {r.status === 'SAMPLE_COLLECTED' && (
                    <button
                      onClick={() => handleUpdateStatus(r.id, 'PROCESSING')}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition"
                    >
                      Begin Analysis
                    </button>
                  )}

                  {r.status === 'PROCESSING' && (
                    <button
                      onClick={() => handleOpenResultModal(r)}
                      className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                    >
                      <FileCheck className="w-4 h-4" /> Enter Results & Return to Doctor
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL: SUBMIT LAB RESULTS */}
      {showResultModal && selectedReferral && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-teal-600" /> Enter Diagnostic Findings
              </h3>
              <button
                onClick={() => setShowResultModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-teal-50 rounded-xl mb-4 border border-teal-100 text-xs text-teal-900">
              <div className="font-extrabold text-sm text-teal-950">
                {selectedReferral.first_name} {selectedReferral.last_name} ({selectedReferral.patient_id_display})
              </div>
              <div className="mt-1">
                Ordered Test: <b>{selectedReferral.test_type}</b>
              </div>
              <div>Referring Doctor: <b>{selectedReferral.doctor_name}</b> ({selectedReferral.room_number})</div>
            </div>

            <form onSubmit={handleCompleteTest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pathology / Diagnostic Results Summary *
                </label>
                <textarea
                  rows="4"
                  required
                  placeholder="Document laboratory findings, quantitative values, or specimen analysis..."
                  value={resultsText}
                  onChange={(e) => setResultsText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono text-slate-800"
                />
              </div>

              <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-600">
                ℹ️ <b>Workflow Automation:</b> Submitting will mark this test completed, log patient transit in the audit trail, and immediately return the patient to <b>{selectedReferral.doctor_name}</b>'s examination queue for post-lab review.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResultModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold shadow"
                >
                  Confirm & Dispatch Results
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
