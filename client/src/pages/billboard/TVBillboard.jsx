import React, { useState, useEffect } from 'react';
import { queueService } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { announceTicketCall, stopSpeaking } from '../../services/voiceService';
import {
  Tv,
  BellRing,
  Volume2,
  VolumeX,
  Clock,
  Activity,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Maximize2
} from 'lucide-react';

export default function TVBillboard({ onBackToApp }) {
  const { socket, playChime } = useSocket();
  const [billboardData, setBillboardData] = useState({
    calledNow: [],
    currentlyServing: [],
    waitingQueue: [],
  });
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [activeCallBanner, setActiveCallBanner] = useState(null);

  // Voice Announcement Settings
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [privacyMode, setPrivacyMode] = useState('FIRST_NAME_AND_TICKET'); // 'FIRST_NAME_AND_TICKET' or 'TICKET_ONLY'

  useEffect(() => {
    loadBillboardData();

    // Clock ticker
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Socket.IO real-time event subscriptions
  useEffect(() => {
    if (!socket) return;

    socket.emit('join:billboard');

    // When doctor calls ticket
    socket.on('queue:ticket-called', (data) => {
      setActiveCallBanner(data);
      loadBillboardData();
      try {
        playChime();
        if (voiceEnabled) {
          setTimeout(() => {
            announceTicketCall(data, { privacyMode });
          }, 600);
        }
      } catch (err) {}

      // Keep banner glowing for 15 seconds
      setTimeout(() => {
        setActiveCallBanner(null);
      }, 15000);
    });

    socket.on('queue:ticket-created', () => loadBillboardData());
    socket.on('queue:status-updated', () => loadBillboardData());

    return () => {
      socket.off('queue:ticket-called');
      socket.off('queue:ticket-created');
      socket.off('queue:status-updated');
    };
  }, [socket]);

  const loadBillboardData = async () => {
    try {
      const res = await queueService.getBillboardFeed();
      if (res.success) {
        setBillboardData({
          calledNow: res.calledNow || [],
          currentlyServing: res.currentlyServing || [],
          waitingQueue: res.waitingQueue || [],
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualTestChime = () => {
    playChime();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans select-none">
      {/* TV Header Bar */}
      <header className="px-8 py-5 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-hospital-600 flex items-center justify-center font-bold text-white shadow-lg shadow-hospital-600/30">
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight text-white">
                 <span className="text-hospital-400"></span>
              </span>
              <span className="text-xs uppercase font-extrabold px-2 py-0.5 rounded bg-hospital-900 text-hospital-300 border border-hospital-700">
                Public Patient Display
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Privacy Enforced: Ticket numbers & room locations only
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Voice Announcement Mute / Unmute Toggle */}
          <button
            onClick={() => {
              if (voiceEnabled) stopSpeaking();
              setVoiceEnabled(!voiceEnabled);
            }}
            title={voiceEnabled ? 'Voice queue announcements active' : 'Voice queue announcements muted'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              voiceEnabled
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            <span>{voiceEnabled ? 'Voice Alerts ON' : 'Voice Muted'}</span>
          </button>

          {/* Privacy Level Selector */}
          <select
            value={privacyMode}
            onChange={(e) => setPrivacyMode(e.target.value)}
            className="bg-slate-800 text-slate-300 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
          >
            <option value="FIRST_NAME_AND_TICKET">Call: First Name + Ticket</option>
            <option value="TICKET_ONLY">Call: Ticket # Only</option>
          </select>

          {/* Test Sound Button */}
          <button
            onClick={handleManualTestChime}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition"
          >
            <Volume2 className="w-4 h-4 text-hospital-400" /> Test Chime
          </button>

          {/* Return button if embedded in app */}
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition"
            >
              Exit TV Mode
            </button>
          )}

          {/* High Contrast Clock */}
          <div className="text-right">
            <div className="text-2xl font-mono font-black text-hospital-400 tracking-wider">
              {currentTime}
            </div>
            <div className="text-xs text-slate-500 font-semibold uppercase">
              Hospital Local Time
            </div>
          </div>
        </div>
      </header>

      {/* ACTIVE CALL NOW PROMINENT BANNER (Triggered when doctor hits "Call Patient") */}
      {activeCallBanner && (
        <div className="bg-gradient-to-r from-hospital-600 via-hospital-500 to-teal-500 px-8 py-6 shadow-2xl border-y border-hospital-400 animate-glow">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 bg-white text-hospital-900 rounded-3xl flex items-center justify-center font-black text-4xl shadow-xl animate-bounce">
                <BellRing className="w-10 h-10 text-hospital-600" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-hospital-100 flex items-center gap-2 justify-center md:justify-start">
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                  Now Calling Ticket
                </div>
                <div className="text-5xl font-black text-white tracking-tight mt-1">
                  {activeCallBanner.ticket_number}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  playChime();
                  announceTicketCall(activeCallBanner, { privacyMode });
                }}
                className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-xl backdrop-blur border border-white/30 transition flex items-center gap-1.5 shadow"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Repeat Call
              </button>

              <div className="bg-white/15 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/20 text-center md:text-right">
                <div className="text-xs font-bold uppercase tracking-wider text-hospital-100">
                  Please Proceed To
                </div>
                <div className="text-4xl font-black text-white mt-0.5">
                  {activeCallBanner.room_number || 'Room 101'}
                </div>
                <div className="text-xs text-hospital-100 mt-1 font-semibold">
                  {activeCallBanner.department_name}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Split Screen */}
      <main className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto w-full">
        {/* Left Column: Currently Serving at Rooms (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-lg font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              Currently Serving in Rooms
            </h2>
            <span className="text-xs font-mono text-slate-500">Live Consultation Stations</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            {billboardData.currentlyServing.length === 0 ? (
              <div className="col-span-2 flex flex-col items-center justify-center p-12 bg-slate-900/60 rounded-3xl border border-slate-800/80 text-slate-500">
                <Clock className="w-12 h-12 mb-3 text-slate-700" />
                <p className="text-base font-bold">All Consultation Rooms Preparing</p>
                <p className="text-xs text-slate-600 mt-1">Next ticket will appear immediately when called.</p>
              </div>
            ) : (
              billboardData.currentlyServing.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900/90 rounded-3xl p-6 border-2 border-emerald-500/40 shadow-xl flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-800">
                      Serving Now
                    </span>
                    <span className="text-sm font-bold text-slate-400">
                      {item.department_name}
                    </span>
                  </div>

                  <div className="my-6 text-center">
                    <div className="text-5xl font-black tracking-tight text-white">
                      {item.ticket_number}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Room Location:</span>
                    <span className="text-base font-black text-hospital-300 bg-hospital-950 px-3 py-1 rounded-xl border border-hospital-800">
                      {item.room_number || 'Room 101'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Next in Line Waiting Queue (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-lg font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Clock className="w-5 h-5 text-hospital-400" />
              Next in Line (Waiting)
            </h2>
            <span className="text-xs font-mono text-slate-500">
              {billboardData.waitingQueue.length} In Waiting Queue
            </span>
          </div>

          <div className="bg-slate-900/80 rounded-3xl p-4 border border-slate-800 flex-1 overflow-hidden">
            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
              {billboardData.waitingQueue.length === 0 ? (
                <div className="text-center py-16 text-slate-600 text-sm">
                  Waiting area is currently clear.
                </div>
              ) : (
                billboardData.waitingQueue.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-xs">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="text-lg font-black text-white">
                          {item.ticket_number}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.department_name}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                        item.priority === 'EMERGENCY'
                          ? 'bg-red-950 text-red-400 border border-red-800 animate-pulse'
                          : item.priority === 'URGENT'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {item.priority}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Ticker Footer */}
      <footer className="px-8 py-3 bg-slate-900/90 border-t border-slate-800 text-xs text-slate-400 flex justify-between items-center">
        <div>
          📢 <b>Notice to Visitors:</b> Please remain seated in your assigned department waiting hall. Your number will be called with an audio chime.
        </div>
        <div className="font-mono text-slate-500 text-[11px]">
          Powered by CareFlow AI Engine • Real-time Socket Synchronization
        </div>
      </footer>
    </div>
  );
}
