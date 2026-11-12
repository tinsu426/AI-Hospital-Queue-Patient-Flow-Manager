import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  Activity,
  Tv,
  Users,
  Stethoscope,
  FlaskConical,
  Sparkles,
  LogOut,
  ShieldAlert,
  ClipboardList,
  Compass,
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();

  const getRoleBadge = (role) => {
    switch (role) {
      case 'doctor':
        return 'bg-blue-600 text-white';
      case 'triage':
        return 'bg-amber-600 text-white';
      case 'receptionist':
        return 'bg-emerald-600 text-white';
      case 'lab':
        return 'bg-purple-600 text-white';
      case 'admin':
        return 'bg-rose-600 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-hospital-700 to-hospital-500 flex items-center justify-center text-white shadow-md">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-hospital-100 text-hospital-800 border border-hospital-200">
                  Hospital Queue
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Real-Time Patient Flow & Queue Manager</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="hidden md:flex items-center gap-1">
            {/* Receptionist Tab */}
            {(user?.role === 'receptionist' || user?.role === 'admin') && (
              <button
                onClick={() => setActiveTab('receptionist')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                  activeTab === 'receptionist'
                    ? 'bg-hospital-50 text-hospital-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Users className="w-4 h-4" />
                Reception
              </button>
            )}

            {/* Triage Tab */}
            {(user?.role === 'triage' || user?.role === 'receptionist' || user?.role === 'admin') && (
              <button
                onClick={() => setActiveTab('triage')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                  activeTab === 'triage'
                    ? 'bg-amber-50 text-amber-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                Triage Station
              </button>
            )}

            {/* Doctor Desk */}
            {(user?.role === 'doctor' || user?.role === 'admin') && (
              <button
                onClick={() => setActiveTab('doctor')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                  activeTab === 'doctor'
                    ? 'bg-hospital-50 text-hospital-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Stethoscope className="w-4 h-4" />
                Doctor Desk
              </button>
            )}

            {/* Laboratory Workbench */}
            {(user?.role === 'lab' || user?.role === 'admin') && (
              <button
                onClick={() => setActiveTab('laboratory')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                  activeTab === 'laboratory'
                    ? 'bg-purple-50 text-purple-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FlaskConical className="w-4 h-4" />
                Laboratory
              </button>
            )}

            {/* Hospital Wayfinding & Navigation Map */}
            <button
              onClick={() => setActiveTab('navigation')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                activeTab === 'navigation'
                  ? 'bg-hospital-50 text-hospital-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Compass className="w-4 h-4 text-hospital-600" />
              Hospital Map
            </button>

            {/* AI Flow Analytics (Visible to all staff) */}
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                activeTab === 'analytics'
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-4 h-4 text-indigo-500" />
              AI Intelligence
            </button>

            {/* Admin Management */}
            {user?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                  activeTab === 'admin'
                    ? 'bg-rose-50 text-rose-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                Admin
              </button>
            )}

            {/* Public TV Billboard Switcher */}
            <button
              onClick={() => setActiveTab('billboard')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                activeTab === 'billboard'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Tv className="w-4 h-4" />
              TV Display
            </button>
          </nav>

          {/* User profile, Live sync badge, Logout */}
          <div className="flex items-center gap-3">
            {/* Live Socket Indicator */}
            <div
              className={`hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-red-50 text-red-600 border-red-200'
              }`}
              title={isConnected ? 'Real-Time WebSocket Connected' : 'Reconnecting to Server...'}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-ping' : 'bg-red-500'
                }`}
              />
              {isConnected ? 'Live Sync' : 'Offline'}
            </div>

            {/* User Profile */}
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-800">{user.fullName}</div>
                  <span
                    className={`inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 rounded ${getRoleBadge(
                      user.role
                    )}`}
                  >
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  title="Sign out"
                  className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
