import React, { useState, useEffect } from 'react';
import { NavTab } from './types';
import { ALL_EVENTS } from './data/events';
import { useAuth } from './hooks/useAuth';
import { useTeam } from './hooks/useTeam';
import { signOut } from './services/auth';
import { isProfileComplete } from './services/userProfile';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomeView } from './components/HomeView';
import { AboutView } from './components/AboutView';
import { EventsView } from './components/EventsView';
import { ScheduleView } from './components/ScheduleView';
import { PrizesView } from './components/PrizesView';
import { AuthView } from './components/AuthView';
import { OnboardingForm } from './components/OnboardingForm';
import { TeamDashboard } from './components/TeamDashboard';
import { AdminView } from './components/AdminView';
import { EventDetailModal } from './components/EventDetailModal';
import { Save, Loader2, CheckCircle2, Eye, Undo2, Redo2 } from 'lucide-react';

export function App() {
  const { user, userProfile, loading: authLoading, refreshProfile } = useAuth();
  const { team, loading: teamLoading, refresh: refreshTeam } = useTeam(user, userProfile);
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [preselectedTechId, setPreselectedTechId] = useState<string>('');
  const [preselectedNonTechId, setPreselectedNonTechId] = useState<string>('');
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPassInput, setAdminPassInput] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminSection, setAdminSection] = useState<NavTab>('home');
  const [adminControls, setAdminControls] = useState<{
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    historyLabel: string;
    onSave: () => void;
    saving: boolean;
    saved: boolean;
  } | null>(null);

  const selectedEvent = ALL_EVENTS.find(e => e.id === selectedEventId);

  const needsOnboarding = !!user && !!userProfile && !isProfileComplete(userProfile);

  useEffect(() => {
    if (needsOnboarding && activeTab !== 'register') {
      setActiveTab('register');
    }
  }, [needsOnboarding, activeTab]);

  const handleSelectEventModal = (eventId: string) => {
    setSelectedEventId(eventId);
  };

  const handleSelectEventForRegistration = (eventId: string, category: 'technical' | 'civilian') => {
    if (category === 'technical') {
      setPreselectedTechId(eventId);
    } else {
      setPreselectedNonTechId(eventId);
    }
    setActiveTab('register');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminNav = () => {
    setActiveTab('admin');
  };

  const handleSignOut = async () => {
    await signOut();
    setAdminUnlocked(false);
    setActiveTab('home');
  };

  const verifyAdminPassword = async () => {
    if (!adminPassInput.trim()) return;
    setAdminLoading(true);
    setAdminError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassInput }),
      });
      if (res.ok) {
        setAdminUnlocked(true);
      } else {
        setAdminError('Wrong password');
      }
    } catch {
      setAdminError('Connection error. Try again.');
    } finally {
      setAdminLoading(false);
    }
  };

  const renderRegister = () => {
    if (authLoading) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#bb0013]" />
        </div>
      );
    }
    if (!user) {
      return <AuthView />;
    }
    if (!userProfile) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#bb0013]" />
        </div>
      );
    }
    if (needsOnboarding) {
      return (
        <OnboardingForm
          user={user}
          userProfile={userProfile}
          onComplete={refreshProfile}
        />
      );
    }
    if (teamLoading) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#bb0013]" />
        </div>
      );
    }
    return (
      <TeamDashboard
        user={user}
        team={team}
        onTeamChange={refreshTeam}
        setActiveTab={setActiveTab}
        preselectedTechId={preselectedTechId}
        preselectedNonTechId={preselectedNonTechId}
      />
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f4ead5] text-[#1a1a1a] selection:bg-[#e71620] selection:text-white">
      
      {/* Sticky Pop-Art Header Navigation */}
      <Navbar activeTab={activeTab} setActiveTab={(tab) => {
        if (tab === 'admin') {
          handleAdminNav();
        } else {
          setActiveTab(tab);
        }
      }} editable={activeTab === 'admin'} activeSection={activeTab === 'admin' ? adminSection : undefined} onNavClick={activeTab === 'admin' ? (tab) => {
        setAdminSection(tab);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } : undefined}
      user={user}
      userProfile={userProfile}
      team={team}
      onSignOut={handleSignOut}
      rightContent={activeTab === 'admin' && adminControls ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-zinc-800 rounded overflow-hidden">
            <button onClick={adminControls.onUndo} disabled={!adminControls.canUndo}
              title="Undo (Ctrl+Z)"
              className="flex items-center gap-1 px-3 py-1.5 text-white font-anton text-xs uppercase cursor-pointer hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-r border-zinc-700"
            >
              <Undo2 className="w-3.5 h-3.5" /> UNDO
            </button>
            <button onClick={adminControls.onRedo} disabled={!adminControls.canRedo}
              title="Redo (Ctrl+Y)"
              className="flex items-center gap-1 px-3 py-1.5 text-white font-anton text-xs uppercase cursor-pointer hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Redo2 className="w-3.5 h-3.5" /> REDO
            </button>
          </div>
          <span className="text-zinc-500 font-bricolage text-xs hidden lg:inline">
            {adminControls.historyLabel}
          </span>
          <button onClick={() => setActiveTab('home')}
            className="flex items-center gap-1 bg-transparent hover:bg-zinc-800 text-white font-anton text-xs px-3 py-1.5 border border-zinc-600 uppercase cursor-pointer transition-colors"
          >
            <Eye className="w-3.5 h-3.5" /> VIEW SITE
          </button>
          <button onClick={adminControls.onSave} disabled={adminControls.saving}
            className="flex items-center gap-1.5 bg-[#bb0013] hover:bg-[#d90017] text-white font-anton text-xs px-4 py-1.5 comic-border-thick shadow-comic uppercase cursor-pointer disabled:opacity-50 transition-colors"
          >
            {adminControls.saving ? <Loader2 className="w-3 h-3 animate-spin" /> : adminControls.saved ? <CheckCircle2 className="w-3 h-3" /> : <Save className="w-3 h-3" />}
            {adminControls.saving ? 'SAVING...' : adminControls.saved ? 'SAVED!' : 'SAVE'}
          </button>
        </div>
      ) : undefined} />

      {/* Main View Screen Content */}
      <main className="flex-grow">
        {activeTab === 'home' && (
          <HomeView 
            setActiveTab={setActiveTab} 
            onSelectEvent={handleSelectEventModal} 
          />
        )}

        {activeTab === 'about' && (
          <AboutView setActiveTab={setActiveTab} />
        )}

        {activeTab === 'events' && (
          <EventsView 
            setActiveTab={setActiveTab} 
            onSelectEvent={handleSelectEventModal} 
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleView setActiveTab={setActiveTab} />
        )}

        {activeTab === 'prizes' && (
          <PrizesView setActiveTab={setActiveTab} />
        )}

        {activeTab === 'register' && renderRegister()}

        {activeTab === 'admin' && (
          adminUnlocked ? (
            <AdminView setActiveTab={setActiveTab} onSelectEvent={handleSelectEventModal} activeSection={adminSection} onControlsReady={setAdminControls} />
          ) : (
            <div className="flex items-center justify-center min-h-[60vh] px-4">
              <div className="bg-white p-8 comic-border-ultra shadow-comic-lg max-w-md w-full text-center space-y-6">
                <div className="bg-[#1a1a1a] text-white p-4 comic-border-thick font-anton text-2xl tracking-wider">
                  ADMIN ACCESS
                </div>
                <p className="font-bricolage text-sm text-zinc-600">Enter the admin password to access the content manager.</p>
                <input
                  type="password"
                  value={adminPassInput}
                  onChange={(e) => {
                    setAdminPassInput(e.target.value);
                    setAdminError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !adminLoading) {
                      verifyAdminPassword();
                    }
                  }}
                  placeholder="Enter password"
                  disabled={adminLoading}
                  className="w-full px-4 py-3 bg-[#f4ead5] comic-border-thick font-bricolage text-sm focus:outline-none focus:ring-2 focus:ring-[#bb0013] text-center disabled:opacity-50"
                />
                {adminError && (
                  <p className="text-[#bb0013] font-bricolage text-sm font-semibold">{adminError}</p>
                )}
                <button
                  onClick={verifyAdminPassword}
                  disabled={adminLoading}
                  className="w-full bg-[#bb0013] hover:bg-[#d90017] text-white font-anton text-xl py-3 comic-border-thick shadow-comic uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {adminLoading ? 'VERIFYING...' : 'UNLOCK'}
                </button>
              </div>
            </div>
          )
        )}
      </main>

      {/* Pop-Art Footer (hidden in admin mode — AdminEditView renders its own inside ContentOverrideProvider) */}
      {activeTab !== 'admin' && <Footer setActiveTab={setActiveTab} />}

      {/* Event Details Popup Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEventId(null)}
          onSelectForRegistration={handleSelectEventForRegistration}
        />
      )}

    </div>
  );
}

export default App;
