import React, { useState, useEffect, useRef } from 'react';
import { chatbotService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  speakText,
  stopSpeaking,
  createSpeechRecognizer,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported
} from '../../services/voiceService';
import {
  MessageSquare,
  X,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Bot,
  User,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export default function ChatbotDrawer({ onNavigateTab }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: `Hello ${user?.fullName ? user.fullName.split(' ')[0] : 'there'}! I am your **CareFlow Clinical Operations Assistant**.\n\nI can provide live waiting statistics, department navigation directions, and system operational guidance.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      quickLinks: [
        { label: '📊 Live Hospital Radar', tab: 'analytics' },
        { label: '🗺️ Hospital Map', tab: 'navigation' },
      ],
      suggestions: [
        'How many patients are waiting right now?',
        'Where is the laboratory?',
        'Which departments are busy?',
        'How do I add a doctor?',
      ],
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  // Voice Assistant State
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [assistantName, setAssistantName] = useState('CareFlow Assistant');
  const [micError, setMicError] = useState(null);

  const messagesEndRef = useRef(null);
  const recognizerRef = useRef(null);

  useEffect(() => {
    loadSuggestions();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const loadSuggestions = async () => {
    try {
      const res = await chatbotService.getSuggestions();
      if (res.success) setSuggestions(res.suggestions);
    } catch {
      // fallback suggestions
    }
  };

  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    const userMessage = {
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);
    setMicError(null);

    try {
      const res = await chatbotService.sendMessage(text);
      if (res.success && res.data) {
        const assistantMessage = {
          sender: 'assistant',
          text: res.data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          quickLinks: res.data.quickLinks || [],
          suggestions: res.data.suggestions || [],
          navigationTarget: res.data.navigationTarget || null,
          systemStats: res.data.systemStats || null,
          aiProviderStatus: res.data.aiProviderStatus || null,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Speak response if voice audio is enabled
        if (voiceEnabled) {
          setIsSpeaking(true);
          speakText(res.data.reply, {
            onEnd: () => setIsSpeaking(false),
            onError: () => setIsSpeaking(false),
          });
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `⚠️ **Error:** Unable to complete request: ${err.message || 'Server error'}. Please try again.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Toggle Voice Recognition (Microphone)
  const toggleListening = () => {
    if (isListening) {
      if (recognizerRef.current) {
        recognizerRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    setMicError(null);

    const recognizer = createSpeechRecognizer({
      onStart: () => setIsListening(true),
      onResult: ({ final, interim }) => {
        if (interim) setInputValue(interim);
        if (final) {
          setInputValue(final);
          handleSendMessage(final);
        }
      },
      onError: (err) => {
        setIsListening(false);
        setMicError(err.message);
      },
      onEnd: () => setIsListening(false),
    });

    if (recognizer) {
      recognizerRef.current = recognizer;
      try {
        recognizer.start();
      } catch (err) {
        setMicError('Could not start microphone.');
        setIsListening(false);
      }
    } else {
      setMicError('Speech recognition is not supported in this browser.');
    }
  };

  const handleSpeakMessage = (text) => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      speakText(text, {
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  const handleLinkClick = (link) => {
    if (onNavigateTab && link.tab) {
      onNavigateTab(link.tab, link.targetCode || null);
    }
  };

  return (
    <>
      {/* Floating Toggle Button (Bottom-Right) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-tr from-hospital-700 to-indigo-600 text-white font-extrabold text-sm shadow-2xl hover:scale-105 transition-all animate-glow border-2 border-white/20"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
          </div>
          <span>AI Assistant</span>
        </button>
      )}

      {/* Slide-out Drawer */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-md h-[620px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-hospital-800 to-indigo-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center font-bold text-white shadow">
                <Bot className="w-5 h-5 text-cyan-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm tracking-tight">{assistantName}</h3>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300 font-bold uppercase">
                    Live
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> System Grounded • Role: {user?.role || 'Staff'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Voice Read Aloud Toggle */}
              <button
                onClick={() => {
                  if (voiceEnabled) stopSpeaking();
                  setVoiceEnabled(!voiceEnabled);
                }}
                title={voiceEnabled ? 'Voice readout enabled' : 'Voice readout muted'}
                className={`p-1.5 rounded-lg text-xs transition ${
                  voiceEnabled ? 'text-amber-300 bg-white/10' : 'text-slate-400 hover:bg-white/10'
                }`}
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                onClick={() => {
                  stopSpeaking();
                  setIsOpen(false);
                }}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Microphone Error Banner */}
          {micError && (
            <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{micError}</span>
            </div>
          )}

          {/* Message Thread */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/70">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-hospital-600 text-white flex-shrink-0 flex items-center justify-center font-bold text-xs mt-1 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-sm ${
                    m.sender === 'user'
                      ? 'bg-hospital-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                  }`}
                >
                  {/* Message Prose with Markdown styling */}
                  <div className="whitespace-pre-line font-normal">
                    {m.text}
                  </div>

                  {/* Quick Action Navigation Links */}
                  {m.quickLinks && m.quickLinks.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                      {m.quickLinks.map((link, lIdx) => (
                        <button
                          key={lIdx}
                          onClick={() => handleLinkClick(link)}
                          className="px-2.5 py-1 rounded-lg bg-hospital-50 hover:bg-hospital-100 text-hospital-800 font-bold text-[11px] border border-hospital-200 transition flex items-center gap-1"
                        >
                          <span>{link.label}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Footer with Timestamp and Read Aloud button */}
                  <div className="mt-2 pt-1 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{m.timestamp}</span>
                    {m.sender === 'assistant' && isSpeechSynthesisSupported() && (
                      <button
                        onClick={() => handleSpeakMessage(m.text)}
                        title="Read message aloud"
                        className="hover:text-hospital-600 p-0.5"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {m.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex-shrink-0 flex items-center justify-center font-bold text-xs mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 items-center text-xs text-slate-500 italic p-2 bg-white rounded-xl border border-slate-200 w-max">
                <span className="w-2 h-2 rounded-full bg-hospital-500 animate-ping" />
                Querying authorized hospital metrics...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion Pills */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto">
            {suggestions.slice(0, 4).map((s, sIdx) => (
              <button
                key={sIdx}
                onClick={() => handleSendMessage(s)}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-hospital-50 hover:text-hospital-700 text-slate-600 text-[10px] font-semibold whitespace-nowrap transition border border-slate-200"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input & Voice Controls */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            {/* Microphone Button */}
            <button
              onClick={toggleListening}
              title={isListening ? 'Stop listening' : 'Speak your question'}
              className={`p-2.5 rounded-xl transition ${
                isListening
                  ? 'bg-red-600 text-white animate-pulse shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-hospital-50 hover:text-hospital-600'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={isListening ? 'Listening to voice...' : 'Ask question or directions...'}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-hospital-500"
            />

            {/* Send Button */}
            <button
              onClick={() => handleSendMessage()}
              disabled={loading || !inputValue.trim()}
              className="p-2.5 bg-hospital-600 hover:bg-hospital-700 disabled:opacity-40 text-white rounded-xl transition shadow"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
