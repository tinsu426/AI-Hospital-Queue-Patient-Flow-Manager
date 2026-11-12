import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastAnnouncement, setLastAnnouncement] = useState(null);

  useEffect(() => {
    // Socket.IO connects to root origin (proxied or port 5000)
    const socketInstance = io(window.location.hostname === 'localhost' ? 'http://localhost:5000' : '/', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });

    socketInstance.on('connect', () => {
      // console.log('[Socket.IO Client] Connected:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      // console.log('[Socket.IO Client] Disconnected');
      setIsConnected(false);
    });

    // Listen to global ticket called event for TV Billboard & chime
    socketInstance.on('queue:ticket-called', (data) => {
      setLastAnnouncement(data);
      // Play synthetic notification tone
      try {
        playChime();
      } catch (err) {
        // audio might require user interaction first
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Web Audio API chime tone (no external mp3 dependency required!)
  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3); // A5

      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.85);
    } catch {
      // ignore audio context restrictions
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, lastAnnouncement, playChime }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
}
