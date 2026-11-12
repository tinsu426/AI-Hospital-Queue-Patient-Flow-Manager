import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Activity, Lock, User, AlertCircle, Tv, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Login({ onOpenBillboard }) {
  const { login } = useAuth();
  const [username, setUsername] = useState('receptionist1');
  const [password, setPassword] = useState('Staff@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-hospital-900 to-slate-950 flex flex-col justify-center items-center px-4 py-8">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-hospital-600 text-white shadow-xl shadow-hospital-500/20 mb-4 animate-glow">
          <Activity className="w-9 h-9" />
        </div>
        
        <p className="text-hospital-200/80 text-sm mt-1">
          Hospital Queue & Patient Flow Management System
        </p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800">Staff Portal Sign In</h2>
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" /> HIPAA Compliant
          </span>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter staff username"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-hospital-500 focus:bg-white text-sm transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-hospital-500 focus:bg-white text-sm transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-hospital-600 hover:bg-hospital-700 text-white font-bold rounded-xl shadow-lg shadow-hospital-600/30 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Sign In to Dashboard <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Fill Buttons */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Quick Switch Demo Roles:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => handleQuickFill('receptionist1', 'Staff@123')}
              className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold border border-emerald-200 transition text-left"
            >
              👩‍💼 Receptionist
            </button>
            <button
              onClick={() => handleQuickFill('nurse1', 'Staff@123')}
              className="p-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold border border-amber-200 transition text-left"
            >
                Nurse
            </button>
            <button
              onClick={() => handleQuickFill('dr.smith', 'Doctor@123')}
              className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold border border-blue-200 transition text-left"
            >
               Dr.Alemu (Gen)
            </button>
            <button
              onClick={() => handleQuickFill('labtech1', 'Staff@123')}
              className="p-2 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold border border-purple-200 transition text-left"
            >
               Lab Tech
            </button>
            <button
              onClick={() => handleQuickFill('dr.adams', 'Doctor@123')}
              className="p-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-semibold border border-red-200 transition text-left"
            >
               ER Doctor
            </button>
            <button
              onClick={() => handleQuickFill('admin', 'Admin@123')}
              className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold border border-slate-300 transition text-left"
            >
              ⚙️ Admin
            </button>
          </div>
        </div>

        {/* Public TV Billboard Shortcut */}
        <div className="mt-4 pt-4 border-t border-slate-100 text-center">
          <button
            onClick={onOpenBillboard}
            className="inline-flex items-center gap-2 text-xs font-semibold text-hospital-600 hover:text-hospital-800 transition"
          >
            <Tv className="w-4 h-4" /> Open Public TV Billboard (Waiting Room Display)
          </button>
        </div>
      </div>
    </div>
  );
}
