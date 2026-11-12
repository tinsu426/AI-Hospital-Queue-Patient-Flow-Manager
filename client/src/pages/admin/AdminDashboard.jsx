import React, { useState, useEffect } from 'react';
import { doctorService, departmentService, authService } from '../../services/api';
import {
  Users,
  Calendar,
  Building,
  UserPlus,
  Shield,
  Stethoscope,
  Clock,
  CheckCircle,
  FileText
} from 'lucide-react';

export default function AdminDashboard() {
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorSchedules, setDoctorSchedules] = useState([]);
  const [loading, setLoading] = useState(false);

  // New Staff Registration State
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState({
    username: '',
    email: '',
    password: 'Password@123',
    fullName: '',
    role: 'doctor',
  });
  const [staffFeedback, setStaffFeedback] = useState('');

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [docRes, deptRes] = await Promise.all([
        doctorService.getAll(),
        departmentService.getAll(),
      ]);

      if (docRes.success) setDoctors(docRes.doctors);
      if (deptRes.success) setDepartments(deptRes.departments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDoctor = async (doc) => {
    setSelectedDoctor(doc);
    try {
      const res = await doctorService.getById(doc.id);
      if (res.success) {
        setDoctorSchedules(res.schedules || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      const res = await authService.registerStaff(staffForm);
      if (res.success) {
        setStaffFeedback('Staff account created successfully!');
        setStaffForm({
          username: '',
          email: '',
          password: 'Password@123',
          fullName: '',
          role: 'doctor',
        });
        setTimeout(() => {
          setStaffFeedback('');
          setShowStaffModal(false);
        }, 2000);
        loadAdminData();
      }
    } catch (err) {
      setStaffFeedback(err.message || 'Error creating staff');
    }
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-100 text-rose-800">⚙️</span>
            Hospital Administration & Staff Operations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage physician availability, departmental schedules, clinical rooms, and staff accounts.
          </p>
        </div>

        <button
          onClick={() => setShowStaffModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition"
        >
          <UserPlus className="w-4 h-4" /> Add Hospital Staff
        </button>
      </div>

      {/* Main Grid: Doctors & Departments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Doctors Management (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-hospital-600" /> Medical Staff & Physician Roster
            </h2>
            <span className="text-xs text-slate-500">{doctors.length} Registered Doctors</span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {doctors.map((d) => (
              <div
                key={d.id}
                onClick={() => handleSelectDoctor(d)}
                className={`p-4 rounded-xl border transition cursor-pointer flex justify-between items-center ${
                  selectedDoctor?.id === d.id
                    ? 'border-hospital-500 bg-hospital-50/60 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="font-extrabold text-sm text-slate-900">
                    {d.full_name}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {d.specialization} • <b>{d.department_name}</b> ({d.room_number})
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                    d.status === 'AVAILABLE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : d.status === 'BUSY'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {d.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Selected Doctor's Weekly Schedule (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-hospital-600" /> Weekly Working Hours & Capacity
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedDoctor ? `Shift configuration for ${selectedDoctor.full_name}` : 'Select a physician from the roster to inspect'}
            </p>
          </div>

          {selectedDoctor ? (
            <div className="space-y-2">
              {doctorSchedules.length === 0 ? (
                <div className="text-xs text-slate-400 py-6 text-center">
                  No shift schedules configured for this doctor.
                </div>
              ) : (
                doctorSchedules.map((s) => (
                  <div key={s.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800">{dayNames[s.day_of_week]}</span>
                    <span className="font-mono text-slate-600">{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</span>
                    <span className="px-2 py-0.5 rounded bg-hospital-100 text-hospital-800 font-semibold text-[11px]">
                      Max {s.max_patients} pts
                    </span>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 text-xs">
              Click any doctor on the left to review weekly shift schedules and max patient limits.
            </div>
          )}
        </div>
      </div>

      {/* Departments Overview Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
        <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Building className="w-4 h-4 text-hospital-600" /> Hospital Clinical Departments
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((d) => (
            <div key={d.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900">{d.name}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-xs font-mono font-bold">
                    {d.code}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{d.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 text-xs flex justify-between text-slate-600">
                <span>Avg Duration: <b>{d.average_service_time_minutes}m</b></span>
                <span className="text-emerald-700 font-bold">Active</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL: ADD HOSPITAL STAFF ACCOUNT */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Register New Staff Account</h3>

            {staffFeedback && (
              <div className="p-3 mb-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold">
                {staffFeedback}
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Sarah Jenkins, MD"
                  value={staffForm.fullName}
                  onChange={(e) => setStaffForm({ ...staffForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. dr.jenkins"
                  value={staffForm.username}
                  onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  placeholder="jenkins@hospital.local"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role *</label>
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold"
                >
                  <option value="doctor">Doctor</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="triage">Triage Nurse</option>
                  <option value="lab">Laboratory Staff</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
