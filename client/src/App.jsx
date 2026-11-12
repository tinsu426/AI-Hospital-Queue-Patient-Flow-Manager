import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/layout/Navbar';
import Login from './pages/auth/Login';
import ReceptionistDashboard from './pages/receptionist/ReceptionistDashboard';
import TriageDashboard from './pages/triage/TriageDashboard';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import LaboratoryDashboard from './pages/laboratory/LaboratoryDashboard';
import AIFlowDashboard from './pages/analytics/AIFlowDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import TVBillboard from './pages/billboard/TVBillboard';
import HospitalNavigation from './pages/navigation/HospitalNavigation';
import ChatbotDrawer from './components/chatbot/ChatbotDrawer';

function MainApp() {
  const { user, loading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('receptionist');
  const [showPublicBillboard, setShowPublicBillboard] = useState(false);
  const [navigationTargetCode, setNavigationTargetCode] = useState(null);

  const handleNavigateFromChatbot = (tab, targetCode = null) => {
    setActiveTab(tab);
    if (targetCode) {
      setNavigationTargetCode(targetCode);
    }
  };

  // Set default view matching user role
  useEffect(() => {
    if (user?.role) {
      if (user.role === 'doctor') setActiveTab('doctor');
      else if (user.role === 'receptionist') setActiveTab('receptionist');
      else if (user.role === 'triage') setActiveTab('triage');
      else if (user.role === 'lab') setActiveTab('laboratory');
      else if (user.role === 'admin') setActiveTab('analytics');
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-hospital-500 border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-sm font-bold tracking-wider uppercase text-hospital-300">
          Loading CareFlow AI...
        </div>
      </div>
    );
  }

  // If user requested public TV display directly without login
  if (showPublicBillboard) {
    return <TVBillboard onBackToApp={() => setShowPublicBillboard(false)} />;
  }

  // If unauthenticated, show login portal
  if (!isAuthenticated) {
    return <Login onOpenBillboard={() => setShowPublicBillboard(true)} />;
  }

  // If authenticated and user clicked "TV Display" tab
  if (activeTab === 'billboard') {
    return <TVBillboard onBackToApp={() => setActiveTab('receptionist')} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 pb-16">
        {activeTab === 'receptionist' && <ReceptionistDashboard />}
        {activeTab === 'triage' && <TriageDashboard />}
        {activeTab === 'doctor' && <DoctorDashboard />}
        {activeTab === 'laboratory' && <LaboratoryDashboard />}
        {activeTab === 'navigation' && (
          <HospitalNavigation
            initialTargetCode={navigationTargetCode}
            onSelectDepartment={(code) => setNavigationTargetCode(code)}
          />
        )}
        {activeTab === 'analytics' && <AIFlowDashboard />}
        {activeTab === 'admin' && <AdminDashboard />}
      </main>

      {/* Floating AI Hospital Assistant Chatbot with Voice Support */}
      <ChatbotDrawer onNavigateTab={handleNavigateFromChatbot} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <MainApp />
      </SocketProvider>
    </AuthProvider>
  );
}
