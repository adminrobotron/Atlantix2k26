import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { NavTab, Team, UserProfile } from '../types';
import { TECHNICAL_EVENTS, CIVILIAN_EVENTS } from '../data/events';
import { updateTeamEvents } from '../services/team';
import { CreateTeamForm } from './CreateTeamForm';
import { JoinTeamForm } from './JoinTeamForm';
import { TeamCodeDisplay } from './TeamCodeDisplay';
import { TicketModal } from './TicketModal';
import { generateRegistrationId, saveRegistration } from '../services/registration';
import { initEmailJS, sendReceiptEmail } from '../services/email';
import { Zap, Users, UserCheck, ArrowLeft, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface TeamDashboardProps {
  user: User;
  userProfile: UserProfile;
  team: Team | null;
  onTeamChange: () => void;
  setActiveTab: (tab: NavTab) => void;
  preselectedTechId?: string;
  preselectedNonTechId?: string;
}

type TeamView = 'dashboard' | 'create' | 'join';

export const TeamDashboard: React.FC<TeamDashboardProps> = ({
  user, userProfile, team, onTeamChange, setActiveTab, preselectedTechId, preselectedNonTechId
}) => {
  const [view, setView] = useState<TeamView>('dashboard');
  const [submitting, setSubmitting] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [regId, setRegId] = useState('');

  const isLeader = team?.leader.uid === user.uid;
  const selectedTechEvent = TECHNICAL_EVENTS.find(e => e.id === (preselectedTechId || team?.selectedTechEventId));
  const selectedNonTechEvent = CIVILIAN_EVENTS.find(e => e.id === (preselectedNonTechId || team?.selectedNonTechEventId));
  const techFee = selectedTechEvent?.fee || 0;
  const totalFee = 50 + techFee;

  // No team — show create/join choice
  if (!team) {
    if (view === 'create') {
      return <CreateTeamForm user={user} userProfile={userProfile} onTeamCreated={onTeamChange} />;
    }
    if (view === 'join') {
      return <JoinTeamForm user={user} userProfile={userProfile} onTeamJoined={onTeamChange} onBack={() => setView('dashboard')} />;
    }
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="bg-white p-8 comic-border-ultra shadow-comic-lg max-w-md w-full text-center space-y-6">
          <div className="bg-[#1a1a1a] text-white p-4 comic-border-thick font-anton text-2xl tracking-wider">
            ASSEMBLE YOUR TEAM
          </div>
          <p className="font-bricolage text-sm text-zinc-600">
            You're not on a team yet. Create one or join an existing team.
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={() => setView('create')}
              className="w-full bg-[#bb0013] hover:bg-[#d90017] text-white font-anton text-xl py-4 comic-border-thick shadow-comic uppercase cursor-pointer transition-colors flex items-center justify-center gap-2">
              <Zap className="w-5 h-5 text-[#fddc00] fill-[#fddc00]" />
              CREATE TEAM
            </button>
            <button onClick={() => setView('join')}
              className="w-full bg-[#1a1a1a] hover:bg-[#333] text-white font-anton text-xl py-4 comic-border-thick shadow-comic uppercase cursor-pointer transition-colors flex items-center justify-center gap-2">
              <Users className="w-5 h-5" />
              JOIN TEAM
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Has team — show team dashboard
  const handleEventUpdate = async (techId: string, nonTechId: string) => {
    await updateTeamEvents(team.id, techId, nonTechId);
  };

  const handleSubmit = async () => {
    if (!team || team.members.length === 0) return;
    setSubmitting(true);
    try {
      const newRegId = generateRegistrationId();
      setRegId(newRegId);
      await saveRegistration(newRegId, {
        members: team.members.map(m => ({
          fullName: m.displayName,
          dob: m.dob || '',
          phone: m.phone,
          email: m.email,
          branch: m.branch || m.department || '',
          college: m.college,
          year: m.year,
          diet: m.diet,
        })),
        technicalEvent: selectedTechEvent?.title || '',
        nonTechnicalEvent: selectedNonTechEvent?.title || '',
        totalFee,
      });
      initEmailJS();
      const passUrl = `https://atlantix2k26.vercel.app/pass.html?id=${newRegId}&team=${encodeURIComponent(team.leader.displayName)}&event=${encodeURIComponent(selectedTechEvent?.title || 'Robotron 2027')}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${newRegId}`;
      for (const member of team.members) {
        if (member.email) {
          try {
            await sendReceiptEmail({
              memberName: member.displayName,
              memberEmail: member.email,
              regId: newRegId,
              teamLead: team.leader.displayName,
              techEvent: selectedTechEvent?.title || 'None',
              nonTechEvent: selectedNonTechEvent?.title || 'None',
              totalFee,
              passUrl,
              qrUrl,
            });
          } catch (err) { console.error(`Email failed for ${member.email}:`, err); }
        }
      }
      setShowTicket(true);
    } catch (err) {
      console.error(err);
      alert('Registration failed. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Team Code Banner */}
      <TeamCodeDisplay code={team.teamCode} />

      {/* Share prompt */}
      {isLeader && team.members.length < team.maxMembers && (
        <div className="bg-[#fddc00] p-4 comic-border-thick shadow-comic flex items-start gap-3 text-[#1a1a1a]">
          <AlertTriangle className="w-5 h-5 text-[#bb0013] shrink-0 mt-0.5" />
          <p className="font-bricolage text-sm font-bold">
            Share this code with your teammates so they can join your team!
          </p>
        </div>
      )}

      {/* Member List */}
      <div className="bg-white p-6 comic-border-ultra shadow-comic-lg space-y-4">
        <div className="border-b-4 border-[#1a1a1a] pb-3 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#bb0013]" />
          <h3 className="font-anton text-xl text-[#1a1a1a]">
            TEAM MEMBERS ({team.members.length}/{team.maxMembers})
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {team.members.map((member) => (
            <div key={member.uid}
              className={`flex items-center gap-3 p-3 comic-border-thick ${
                member.uid === user.uid ? 'bg-[#fddc00]' : 'bg-[#f4ead5]'
              }`}>
              <div className="w-10 h-10 bg-[#bb0013] text-white font-anton text-lg flex items-center justify-center comic-border-thick shrink-0">
                {member.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-anton text-sm text-[#1a1a1a] truncate">{member.displayName}</p>
                <p className="font-bricolage text-xs text-zinc-500 truncate">{member.email}</p>
              </div>
              {member.role === 'leader' && (
                <span className="bg-[#bb0013] text-white font-anton text-[10px] px-2 py-0.5 comic-border-thick shrink-0">
                  LEADER
                </span>
              )}
              {member.uid === user.uid && member.role !== 'leader' && (
                <span className="bg-[#3467ff] text-white font-anton text-[10px] px-2 py-0.5 comic-border-thick shrink-0">
                  YOU
                </span>
              )}
            </div>
          ))}
          {/* Empty slots */}
          {Array.from({ length: team.maxMembers - team.members.length }).map((_, i) => (
            <div key={`empty-${i}`}
              className="flex items-center gap-3 p-3 border-2 border-dashed border-zinc-300 text-zinc-400">
              <div className="w-10 h-10 border-2 border-dashed border-zinc-300 flex items-center justify-center font-anton text-sm">
                ?
              </div>
              <p className="font-bricolage text-sm">Waiting for member...</p>
            </div>
          ))}
        </div>
      </div>

      {/* Event Selection */}
      <div className="bg-white p-6 comic-border-ultra shadow-comic-lg space-y-4">
        <div className="border-b-4 border-[#1a1a1a] pb-3">
          <h3 className="font-anton text-xl text-[#1a1a1a]">TEAM EVENTS</h3>
          <p className="font-bricolage text-xs text-zinc-500 mt-1">
            {isLeader ? 'Select events for your team' : 'Events selected by your team leader'}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-bricolage">
          <div className="space-y-1.5">
            <label className="block font-anton text-sm text-[#1a1a1a] uppercase">TECHNICAL EVENT</label>
            <select
              value={team.selectedTechEventId}
              onChange={(e) => handleEventUpdate(e.target.value, team.selectedNonTechEventId)}
              disabled={!isLeader}
              className="w-full px-4 py-3 bg-[#f4ead5] comic-border-thick font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#bb0013] cursor-pointer disabled:opacity-60"
            >
              <option value="">-- NONE (HACKATHON ONLY) --</option>
              {TECHNICAL_EVENTS.map(evt => (
                <option key={evt.id} value={evt.id}>{evt.code} - {evt.title} (₹{evt.fee})</option>
              ))}
            </select>
            {selectedTechEvent && (
              <p className="text-xs text-zinc-500 font-semibold mt-1">
                {selectedTechEvent.teamSize} • {selectedTechEvent.timing} • {selectedTechEvent.venue}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="block font-anton text-sm text-[#1a1a1a] uppercase">NON-TECHNICAL EVENT</label>
            <select
              value={team.selectedNonTechEventId}
              onChange={(e) => handleEventUpdate(team.selectedTechEventId, e.target.value)}
              disabled={!isLeader}
              className="w-full px-4 py-3 bg-[#f4ead5] comic-border-thick font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#bb0013] cursor-pointer disabled:opacity-60"
            >
              <option value="">-- NONE --</option>
              {CIVILIAN_EVENTS.map(evt => (
                <option key={evt.id} value={evt.id}>{evt.code} - {evt.title} (FREE)</option>
              ))}
            </select>
            {selectedNonTechEvent && (
              <p className="text-xs text-zinc-500 font-semibold mt-1">
                {selectedNonTechEvent.teamSize} • {selectedNonTechEvent.timing} • {selectedNonTechEvent.venue}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Fee Summary & Submit */}
      <div className="bg-white p-6 comic-border-ultra shadow-comic-lg space-y-5">
        <div className="bg-[#1a1a1a] text-white p-3 comic-border-thick text-center font-anton text-xl tracking-wider">
          FEE SUMMARY
        </div>
        <div className="space-y-3 font-bricolage text-sm font-semibold">
          <div className="flex justify-between items-center py-2 border-b border-zinc-200">
            <span className="text-zinc-700">BASE REGISTRATION</span>
            <span className="font-anton text-lg text-[#1a1a1a]">₹50</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-zinc-200">
            <span className="text-zinc-700">TECHNICAL EVENT</span>
            <span className="font-anton text-lg text-[#bb0013]">
              {selectedTechEvent ? `+ ₹${selectedTechEvent.fee}` : '₹0'}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-zinc-200">
            <span className="text-zinc-700">NON-TECHNICAL EVENT</span>
            <span className="font-anton text-lg text-[#00c853]">FREE</span>
          </div>
          <div className="pt-2 border-t-4 border-[#1a1a1a] flex justify-between items-center">
            <span className="font-anton text-2xl text-[#1a1a1a]">TOTAL</span>
            <span className="font-anton text-4xl text-[#bb0013]">₹{totalFee}</span>
          </div>
        </div>

        {team.status === 'registered' ? (
          <div className="bg-[#00c853] text-white p-4 comic-border-thick text-center font-anton text-lg flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            ALREADY REGISTERED!
          </div>
        ) : (
          <button onClick={handleSubmit} disabled={submitting || team.members.length === 0}
            className="w-full bg-[#bb0013] hover:bg-[#d90017] text-white font-anton text-2xl py-4 comic-border-thick shadow-comic-lg hover:scale-105 active:scale-100 transition-all uppercase cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <Zap className="w-6 h-6 text-[#fddc00] fill-[#fddc00]" />
            {submitting ? 'SUBMITTING...' : 'PROCEED TO PAYMENT'}
          </button>
        )}
      </div>

      {/* Ticket Modal */}
      {showTicket && team && (
        <TicketModal
          registration={{
            members: team.members.map((m, i) => ({
              id: i + 1,
              fullName: m.displayName,
              dob: m.dob || '',
              phone: m.phone,
              email: m.email,
              branch: m.branch || m.department || '',
              college: m.college,
            })),
            activeMemberIndex: 0,
            selectedTechEventId: team.selectedTechEventId,
            selectedNonTechEventId: team.selectedNonTechEventId,
            baseFee: 50,
          }}
          regId={regId}
          onClose={() => setShowTicket(false)}
        />
      )}
    </div>
  );
};
