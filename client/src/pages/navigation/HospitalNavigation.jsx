import React, { useState, useEffect } from 'react';
import { navigationService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Compass,
  MapPin,
  Navigation,
  Search,
  Layers,
  ArrowRight,
  Footprints,
  Clock,
  Building,
  Edit3,
  Check,
  X,
  Stethoscope,
  FlaskConical,
  Activity,
  ShieldAlert
} from 'lucide-react';

export default function HospitalNavigation({ initialTargetCode = null, onSelectDepartment = null }) {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState(null);

  // Route Planning State
  const [routeFrom, setRouteFrom] = useState('RECEPTION_F1');
  const [routeTo, setRouteTo] = useState(initialTargetCode || 'LAB_F2');
  const [activeRoute, setActiveRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);

  // Admin Editing Mode
  const [isEditing, setIsEditing] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [editForm, setEditForm] = useState({ floor_number: 1, wing: '', room_number: '', map_x: 200, map_y: 200 });
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadDirectory();
  }, []);

  useEffect(() => {
    if (initialTargetCode) {
      setRouteTo(initialTargetCode);
      handleCalculateRoute('RECEPTION_F1', initialTargetCode);
    }
  }, [initialTargetCode]);

  const loadDirectory = async () => {
    try {
      const res = await navigationService.getDirectory();
      if (res.success) {
        setDepartments(res.departments);
        if (initialTargetCode) {
          const match = res.departments.find(d => d.code === initialTargetCode);
          if (match) {
            setSelectedDept(match);
            setSelectedFloor(match.floor_number);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCalculateRoute = async (from, to) => {
    setRouteLoading(true);
    try {
      const res = await navigationService.getRoute(from, to);
      if (res.success) {
        setActiveRoute(res.route);
        // Switch view to origin floor or destination floor
        if (res.route.origin) {
          setSelectedFloor(res.route.origin.floor_number);
        }
      }
    } catch (err) {
      console.error('Route calculation error:', err);
    } finally {
      setRouteLoading(false);
    }
  };

  const handleQuickRoute = (from, to) => {
    setRouteFrom(from);
    setRouteTo(to);
    handleCalculateRoute(from, to);
  };

  const handleStartEdit = (dept) => {
    setEditDept(dept);
    setEditForm({
      floor_number: dept.floor_number,
      wing: dept.wing,
      room_number: dept.room_number,
      map_x: dept.map_x,
      map_y: dept.map_y,
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editDept) return;
    try {
      const res = await navigationService.updateLocation(editDept.id, editForm);
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        setIsEditing(false);
        loadDirectory();
      }
    } catch (err) {
      alert(err.message || 'Error saving department coordinates');
    }
  };

  const filteredDepartments = departments.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.room_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.wing.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-2 rounded-xl bg-hospital-100 text-hospital-700">
              <Compass className="w-5 h-5" />
            </span>
            Hospital Wayfinding & Smart Navigation
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Interactive floor plan, department directory, clinical transit routes, and shortest-path navigation.
          </p>
        </div>

        {/* Quick Clinical Route Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleQuickRoute('RECEPTION_F1', 'GEN_F2')}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-hospital-50 hover:text-hospital-700 text-xs font-bold text-slate-700 border border-slate-200 transition"
          >
            Reception ➔ Doctor (Room 201)
          </button>
          <button
            onClick={() => handleQuickRoute('GEN_F2', 'LAB_F2')}
            className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-xs font-bold text-purple-700 border border-purple-200 transition"
          >
            Doctor ➔ Laboratory
          </button>
          <button
            onClick={() => handleQuickRoute('LAB_F2', 'GEN_F2')}
            className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-xs font-bold text-teal-700 border border-teal-200 transition"
          >
            Laboratory ➔ Doctor (Return)
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Map (7 Cols) & Route Planner / Directory (5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Interactive Floor Map (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            {/* Floor Switcher & Map Controls */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-hospital-600" />
                <span className="font-extrabold text-sm text-slate-800">Hospital Floor Map</span>
              </div>

              {/* Floor Switcher Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setSelectedFloor(1)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedFloor === 1 ? 'bg-hospital-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Floor 1: Ground Atrium & Emergency
                </button>
                <button
                  onClick={() => setSelectedFloor(2)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedFloor === 2 ? 'bg-hospital-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Floor 2: Specialist Clinics & Lab
                </button>
              </div>
            </div>

            {/* SVG Interactive Architectural Floor Plan */}
            <div className="relative w-full aspect-[4/3] bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
              <svg viewBox="0 0 700 500" className="w-full h-full select-none">
                {/* Background Grid Pattern */}
                <defs>
                  <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e293b" strokeWidth="0.8" />
                  </pattern>
                  <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#14b8a6" />
                  </linearGradient>
                </defs>
                <rect width="700" height="500" fill="#0f172a" />
                <rect width="700" height="500" fill="url(#grid)" />

                {/* Outer Hospital Boundary */}
                <rect x="50" y="30" width="600" height="440" rx="16" fill="#1e293b" stroke="#334155" strokeWidth="3" opacity="0.6" />

                {/* Central Corridor & Hallway */}
                <rect x="300" y="30" width="100" height="440" fill="#0f172a" stroke="#334155" strokeWidth="1.5" strokeDasharray="4 4" />
                <rect x="50" y="210" width="600" height="60" fill="#0f172a" stroke="#334155" strokeWidth="1.5" strokeDasharray="4 4" />

                {/* FLOOR 1 ROOMS */}
                {selectedFloor === 1 && (
                  <g id="floor-1-layout">
                    {/* Main Entrance */}
                    <rect x="300" y="35" width="100" height="40" rx="6" fill="#0369a1" opacity="0.8" />
                    <text x="350" y="60" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">ENTRANCE</text>

                    {/* Reception Desk */}
                    <rect x="290" y="110" width="120" height="60" rx="8" fill="#059669" opacity="0.85" />
                    <text x="350" y="145" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">RECEPTION (Desk A)</text>

                    {/* Triage Station */}
                    <rect x="290" y="210" width="120" height="60" rx="8" fill="#d97706" opacity="0.85" />
                    <text x="350" y="245" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">TRIAGE (Station B)</text>

                    {/* Central Core (Elevators & Stairs) */}
                    <rect x="290" y="310" width="120" height="60" rx="8" fill="#475569" stroke="#64748b" strokeWidth="2" />
                    <text x="350" y="340" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">🛗 ELEVATORS A & B</text>
                    <text x="350" y="355" fill="#94a3b8" fontSize="9" textAnchor="middle">Access to Floor 2</text>

                    {/* Outpatient Pharmacy */}
                    <rect x="420" y="100" width="180" height="80" rx="8" fill="#0d9488" opacity="0.75" />
                    <text x="510" y="145" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">PHARMACY (Room 102)</text>

                    {/* Radiology */}
                    <rect x="100" y="300" width="160" height="90" rx="8" fill="#6366f1" opacity="0.75" />
                    <text x="180" y="345" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">RADIOLOGY (Room 108)</text>
                    <text x="180" y="365" fill="#c7d2fe" fontSize="10" textAnchor="middle">X-Ray, Ultrasound, CT</text>

                    {/* Emergency Bay */}
                    <rect x="440" y="300" width="180" height="90" rx="8" fill="#dc2626" opacity="0.8" />
                    <text x="530" y="345" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">EMERGENCY (ER-Bay 1)</text>
                    <text x="530" y="365" fill="#fecaca" fontSize="10" textAnchor="middle">Trauma & Resuscitation</text>
                  </g>
                )}

                {/* FLOOR 2 ROOMS */}
                {selectedFloor === 2 && (
                  <g id="floor-2-layout">
                    {/* Administration */}
                    <rect x="280" y="60" width="140" height="70" rx="8" fill="#e11d48" opacity="0.75" />
                    <text x="350" y="100" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">ADMINISTRATION</text>

                    {/* Central Elevators on Floor 2 */}
                    <rect x="290" y="210" width="120" height="60" rx="8" fill="#475569" stroke="#64748b" strokeWidth="2" />
                    <text x="350" y="240" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">🛗 ELEVATORS A & B</text>
                    <text x="350" y="255" fill="#94a3b8" fontSize="9" textAnchor="middle">Floor 2 Lobby</text>

                    {/* General Medicine */}
                    <rect x="100" y="110" width="170" height="85" rx="8" fill="#0284c7" opacity="0.8" />
                    <text x="185" y="150" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">GENERAL MEDICINE</text>
                    <text x="185" y="170" fill="#bae6fd" fontSize="10" textAnchor="middle">Room 201 (Dr. Smith)</text>

                    {/* Pediatrics */}
                    <rect x="430" y="110" width="170" height="85" rx="8" fill="#059669" opacity="0.8" />
                    <text x="515" y="150" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">PEDIATRICS</text>
                    <text x="515" y="170" fill="#a7f3d0" fontSize="10" textAnchor="middle">Room 202 (Dr. Chen)</text>

                    {/* Cardiology */}
                    <rect x="100" y="295" width="170" height="85" rx="8" fill="#d97706" opacity="0.8" />
                    <text x="185" y="335" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">CARDIOLOGY</text>
                    <text x="185" y="355" fill="#fde68a" fontSize="10" textAnchor="middle">Room 205 (Dr. Patel)</text>

                    {/* Diagnostic Laboratory */}
                    <rect x="430" y="295" width="170" height="85" rx="8" fill="#7c3aed" opacity="0.85" />
                    <text x="515" y="335" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">LABORATORY</text>
                    <text x="515" y="355" fill="#ddd6fe" fontSize="10" textAnchor="middle">Room 208 (Specimens/Path)</text>
                  </g>
                )}

                {/* ANIMATED ROUTE PATH LINE (When route is active) */}
                {activeRoute && activeRoute.waypoints && (
                  <g id="animated-route">
                    {/* Draw polyline through waypoints on the currently displayed floor */}
                    {(() => {
                      const floorWaypoints = activeRoute.waypoints.filter(w => w.floor === selectedFloor);
                      if (floorWaypoints.length >= 2) {
                        const pointsString = floorWaypoints.map(w => `${w.x},${w.y}`).join(' ');
                        return (
                          <>
                            {/* Outer Glow Line */}
                            <polyline
                              points={pointsString}
                              fill="none"
                              stroke="#0ea5e9"
                              strokeWidth="8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              opacity="0.4"
                            />
                            {/* Animated Dashed Polyline */}
                            <polyline
                              points={pointsString}
                              fill="none"
                              stroke="url(#routeGradient)"
                              strokeWidth="4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeDasharray="8 6"
                              className="animate-pulse"
                            />
                          </>
                        );
                      }
                      return null;
                    })()}

                    {/* Start Pin */}
                    {activeRoute.origin && activeRoute.origin.floor_number === selectedFloor && (
                      <g transform={`translate(${activeRoute.origin.map_x}, ${activeRoute.origin.map_y})`}>
                        <circle r="14" fill="#059669" className="animate-ping" opacity="0.7" />
                        <circle r="10" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />
                        <text y="4" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">A</text>
                      </g>
                    )}

                    {/* Destination Pin */}
                    {activeRoute.destination && activeRoute.destination.floor_number === selectedFloor && (
                      <g transform={`translate(${activeRoute.destination.map_x}, ${activeRoute.destination.map_y})`}>
                        <circle r="16" fill="#ef4444" className="animate-ping" opacity="0.8" />
                        <circle r="12" fill="#dc2626" stroke="#ffffff" strokeWidth="2.5" />
                        <text y="4" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">B</text>
                      </g>
                    )}
                  </g>
                )}
              </svg>

              {/* Map Overlay Badge */}
              <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-slate-300 font-semibold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                Floor {selectedFloor} View
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Route Planner & Department Directory (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. Turn-by-Turn Route Guidance Panel */}
          {activeRoute ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-hospital-600" />
                  <span className="font-extrabold text-sm text-slate-900">Step-by-Step Directions</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                  <Clock className="w-3.5 h-3.5 text-hospital-600" /> ~{activeRoute.estimated_walk_minutes} min ({activeRoute.total_distance_meters}m)
                </div>
              </div>

              {/* Route Summary Card */}
              <div className="p-3 bg-hospital-50/70 rounded-xl border border-hospital-200 text-xs flex justify-between items-center">
                <div>
                  <div className="font-semibold text-slate-500">From</div>
                  <div className="font-bold text-slate-900">{activeRoute.origin?.name} (Floor {activeRoute.origin?.floor_number})</div>
                </div>
                <ArrowRight className="w-4 h-4 text-hospital-600" />
                <div className="text-right">
                  <div className="font-semibold text-slate-500">To Destination</div>
                  <div className="font-bold text-hospital-800">{activeRoute.destination?.name} ({activeRoute.destination?.room_number})</div>
                </div>
              </div>

              {/* Steps List */}
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {activeRoute.steps.map((s, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs p-2.5 rounded-xl border border-slate-100 bg-slate-50/60">
                    <span className="w-6 h-6 rounded-full bg-hospital-600 text-white flex-shrink-0 flex items-center justify-center font-bold text-[11px]">
                      {s.step_number}
                    </span>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-800">{s.instruction}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Floor {s.floor}</div>
                    </div>
                  </div>
                ))}
              </div>

              {activeRoute.is_cross_floor && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
                  ℹ️ Cross-floor transit: Route utilizes Central Elevators A & B located in the Central Core.
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 text-center py-8">
              <Compass className="w-10 h-10 mx-auto text-hospital-400 mb-2" />
              <div className="font-bold text-sm text-slate-800">Route Navigation Ready</div>
              <p className="text-xs text-slate-400 mt-1">Select a destination from the directory below or click any quick route above.</p>
            </div>
          )}

          {/* 2. Department Directory with Search */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <Building className="w-4 h-4 text-hospital-600" /> Department Directory
              </h3>
              <span className="text-xs text-slate-500">{departments.length} Services</span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search departments, rooms, wings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-hospital-500"
              />
            </div>

            {/* Directory Cards */}
            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
              {filteredDepartments.map((dept) => (
                <div
                  key={dept.id}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-hospital-300 hover:bg-hospital-50/30 transition flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <span>{dept.name}</span>
                      <span className="font-mono text-[10px] px-1.5 rounded bg-slate-100 text-slate-600 font-bold">
                        {dept.code}
                      </span>
                    </div>
                    <div className="text-slate-500 mt-0.5">
                      Floor {dept.floor_number} • {dept.wing} • <b>{dept.room_number}</b>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => handleStartEdit(dept)}
                        title="Edit map location"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedFloor(dept.floor_number);
                        handleCalculateRoute('RECEPTION_F1', dept.code);
                      }}
                      className="px-2.5 py-1.5 bg-hospital-600 hover:bg-hospital-700 text-white font-bold rounded-lg transition text-[11px]"
                    >
                      Directions
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: ADMIN EDIT DEPARTMENT LOCATION */}
      {isEditing && editDept && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
            <h3 className="font-bold text-base text-slate-900 mb-3 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-hospital-600" /> Edit {editDept.name} Location
            </h3>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Floor Number</label>
                <select
                  value={editForm.floor_number}
                  onChange={(e) => setEditForm({ ...editForm, floor_number: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                >
                  <option value={1}>Floor 1 (Ground Atrium & Emergency)</option>
                  <option value={2}>Floor 2 (Specialists & Diagnostics)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Wing / Section</label>
                <input
                  type="text"
                  value={editForm.wing}
                  onChange={(e) => setEditForm({ ...editForm, wing: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Room Designation</label>
                <input
                  type="text"
                  value={editForm.room_number}
                  onChange={(e) => setEditForm({ ...editForm, room_number: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Map X Coordinate</label>
                  <input
                    type="number"
                    value={editForm.map_x}
                    onChange={(e) => setEditForm({ ...editForm, map_x: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Map Y Coordinate</label>
                  <input
                    type="number"
                    value={editForm.map_y}
                    onChange={(e) => setEditForm({ ...editForm, map_y: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-2 border border-slate-300 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-hospital-600 hover:bg-hospital-700 text-white rounded-lg font-bold shadow"
                >
                  Save Coordinates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
