import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { MemberDetails, UserProfile } from '../types';
import { getTeamByCode, joinTeamByCode } from '../services/team';
import { detailsFromProfile } from '../services/userProfile';
import { Loader2, Search, Users, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface JoinTeamFormProps {
  user: User;
  userProfile: UserProfile;
  onTeamJoined: () => void;
  onBack?: () => void;
}

export const JoinTeamForm: React.FC<JoinTeamFormProps> = ({ user, userProfile, onTeamJoined, onBack }) => {
  const [teamCode, setTeamCode] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [teamPreview, setTeamPreview] = useState<any>(null);
  const [touched, setTouched] = useState(false);
  const [fieldError, setFieldError] = useState('');

  const details: MemberDetails = detailsFromProfile(userProfile);

  const missing = [
    { label: 'Full name', ok: !!userProfile.displayName },
    { label: 'Phone number', ok: !!details.phone },
    { label: 'Date of birth', ok: !!details.dob },
    { label: 'Department', ok: !!details.department },
    { label: 'Year', ok: !!details.year },
    { label: 'College', ok: !!details.college },
    { label: 'Food preference', ok: !!details.diet },
  ];
  const isReady = missing.every(m => m.ok);

  const formatCode = (val: string) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (clean.length <= 2) return clean;
    if (clean.includes('-')) return clean;
    return clean.slice(0, 2) + '-' + clean.slice(2, 6);
  };

  const validateCode = (code: string) => {
    if (code.trim().length < 3) {
      setFieldError('Enter a valid team code (e.g. RX-7K2M)');
      return false;
    }
    setFieldError('');
    return true;
  };

  const handleCodeChange = (val: string) => {
    setTeamCode(formatCode(val));
    setError('');
    setTeamPreview(null);
    if (touched) validateCode(formatCode(val));
  };

  const handleLookup = async () => {
    setTouched(true);
    if (!validateCode(teamCode)) return;
    setLookingUp(true);
    setError('');
    setTeamPreview(null);
    try {
      const team = await getTeamByCode(teamCode.trim());
      if (!team) { setError('No team found with this code. Check and try again.'); setLookingUp(false); return; }
      if (team.status !== 'forming') { setError('This team is no longer accepting members.'); setLookingUp(false); return; }
      if (team.members.length >= team.maxMembers) { setError('This team is full (4/4 members).'); setLookingUp(false); return; }
      if (team.members.some(m => m.uid === user.uid)) { setError('You are already on this team.'); setLookingUp(false); return; }
      setTeamPreview(team);
    } catch (err: any) {
      setError(err.message || 'Lookup failed');
    }
    setLookingUp(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLookup();
  };

  const handleJoin = async () => {
    if (!teamPreview || !isReady) return;
    setJoining(true);
    setError('');
    try {
      await joinTeamByCode(
        teamPreview.teamCode,
        user.uid,
        userProfile.displayName || user.displayName || user.email?.split('@')[0] || 'Member',
        userProfile.email || user.email || '',
        details
      );
      onTeamJoined();
    } catch (err: any) {
      setError(err.message || 'Failed to join team');
    }
    setJoining(false);
  };

  const inputClass = `flex-1 px-4 py-3 bg-[#f4ead5] comic-border-thick font-anton text-xl text-center tracking-[0.2em] uppercase focus:outline-none focus:ring-2 ${
    touched && fieldError
      ? 'border-[#bb0013] ring-[#bb0013]'
      : 'focus:ring-[#bb0013]'
  }`;

  return (
    <div className="bg-white p-6 sm:p-8 comic-border-ultra shadow-comic-lg max-w-lg mx-auto space-y-6">
      <div className="border-b-4 border-[#1a1a1a] pb-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-1 hover:bg-zinc-100 comic-border-thick cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <h3 className="font-anton text-2xl text-[#1a1a1a]">JOIN A TEAM</h3>
        </div>
        <p className="font-bricolage text-sm text-zinc-500 mt-1">Enter the team code shared by your team leader</p>
      </div>

      <div className="space-y-4 font-bricolage">
        <div className="space-y-1">
          <label className="block font-anton text-sm text-[#1a1a1a] uppercase">TEAM CODE *</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={teamCode}
              onChange={(e) => handleCodeChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => { setTouched(true); validateCode(teamCode); }}
              placeholder="RX-7K2M"
              maxLength={7}
              className={inputClass}
            />
            <button onClick={handleLookup} disabled={lookingUp || teamCode.length < 3}
              className="bg-[#1a1a1a] hover:bg-[#333] text-white font-anton text-sm px-5 py-3 comic-border-thick cursor-pointer disabled:opacity-50 transition-colors flex items-center gap-2">
              {lookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              LOOKUP
            </button>
          </div>
          {touched && fieldError && (
            <p className="text-[#bb0013] text-xs font-bold flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 bg-[#bb0013] rounded-full" />
              {fieldError}
            </p>
          )}
        </div>

        {error && (
          <p className="text-[#bb0013] font-bricolage text-sm font-semibold bg-red-50 p-2 comic-border-thick">{error}</p>
        )}

        <div className="bg-[#f4ead5] p-4 comic-border-thick">
          <p className="text-xs font-bold uppercase text-zinc-500 mb-2">YOUR DETAILS</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 font-bricolage text-sm">
            <p><span className="font-bold text-zinc-500">Name:</span> {userProfile.displayName || '-'}</p>
            <p><span className="font-bold text-zinc-500">Phone:</span> {details.phone || '-'}</p>
            <p><span className="font-bold text-zinc-500">DOB:</span> {details.dob || '-'}</p>
            <p><span className="font-bold text-zinc-500">Department:</span> {details.department || '-'}</p>
            <p><span className="font-bold text-zinc-500">Year:</span> {details.year || '-'}</p>
            <p><span className="font-bold text-zinc-500">College:</span> {details.college || '-'}</p>
            <p className="sm:col-span-2">
              <span className="font-bold text-zinc-500">Food:</span>{' '}
              {details.diet === 'veg' ? 'Veg' : details.diet === 'non-veg' ? 'Non-Veg' : '-'}
            </p>
          </div>
          {!isReady && (
            <p className="mt-3 text-[#bb0013] text-xs font-bold flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 bg-[#bb0013] rounded-full" />
              Complete your profile before joining: {missing.filter(m => !m.ok).map(m => m.label).join(', ')}
            </p>
          )}
        </div>

        {teamPreview && (
          <div className="bg-[#f4ead5] p-5 comic-border-thick space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#bb0013]" />
              <span className="font-anton text-lg text-[#1a1a1a]">TEAM FOUND!</span>
            </div>
            <div className="space-y-1 font-bricolage text-sm">
              <p><span className="font-bold text-zinc-500">Team Name:</span> {teamPreview.teamName}</p>
              <p><span className="font-bold text-zinc-500">Leader:</span> {teamPreview.leader.displayName}</p>
              <p><span className="font-bold text-zinc-500">Members:</span> {teamPreview.members.length}/{teamPreview.maxMembers}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {teamPreview.members.map((m: any) => (
                <span key={m.uid} className="bg-white px-2 py-0.5 comic-border-thick font-bricolage text-xs font-bold">
                  {m.displayName} {m.role === 'leader' ? '(Leader)' : ''}
                </span>
              ))}
            </div>
            <button onClick={handleJoin} disabled={joining || !isReady}
              className="w-full bg-[#00c853] hover:bg-[#00b248] text-white font-anton text-lg py-3 comic-border-thick shadow-comic uppercase cursor-pointer disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {joining ? 'JOINING...' : 'JOIN THIS TEAM'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
