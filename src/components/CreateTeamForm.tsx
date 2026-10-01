import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { UserProfile } from '../types';
import { createTeam } from '../services/team';
import { detailsFromProfile, updateUserProfile } from '../services/userProfile';
import { Loader2, Phone, Building2, GraduationCap, CalendarDays, Salad, Drumstick } from 'lucide-react';

interface CreateTeamFormProps {
  user: User;
  userProfile: UserProfile;
  onTeamCreated: () => void;
}

export const CreateTeamForm: React.FC<CreateTeamFormProps> = ({ user, userProfile, onTeamCreated }) => {
  const [phone, setPhone] = useState(userProfile.phone || '');
  const [branch, setBranch] = useState(userProfile.department || userProfile.branch || '');
  const [college, setCollege] = useState(userProfile.college || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const touch = (field: string) => setTouched(prev => ({ ...prev, [field]: true }));

  const validateField = (field: string, value: string) => {
    let msg = '';
    if (field === 'phone') {
      if (!value.trim()) msg = 'Phone number is required';
      else if (!/^[+\d\s-]{7,15}$/.test(value.trim())) msg = 'Enter a valid phone number';
    }
    setFieldErrors(prev => ({ ...prev, [field]: msg }));
    return msg;
  };

  const handleChange = (field: string, value: string) => {
    if (field === 'phone') setPhone(value);
    else if (field === 'branch') setBranch(value);
    else if (field === 'college') setCollege(value);
    if (touched[field]) validateField(field, value);
    setError('');
  };

  const handleBlur = (field: string) => {
    touch(field);
    const value = field === 'phone' ? phone : field === 'branch' ? branch : college;
    validateField(field, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newTouched: Record<string, boolean> = { phone: true };
    const newErrors: Record<string, string> = {};
    const msg = validateField('phone', phone);
    if (msg) newErrors['phone'] = msg;
    setTouched(newTouched);
    setFieldErrors(newErrors);
    if (msg) return;

    setLoading(true);
    setError('');
    try {
      const displayName = userProfile.displayName || user.displayName || user.email?.split('@')[0] || 'Leader';
      const details = detailsFromProfile({
        ...userProfile,
        phone: phone.trim(),
        department: branch.trim(),
        branch: branch.trim(),
        college: college.trim(),
      });
      await createTeam(
        user.uid,
        displayName,
        userProfile.email || user.email || '',
        details
      );
      await updateUserProfile(user.uid, {
        displayName,
        phone: details.phone,
        branch: details.branch,
        department: details.department,
        college: details.college,
      });
      onTeamCreated();
    } catch (err: any) {
      setError(err.message || 'Failed to create team');
    }
    setLoading(false);
  };

  const inputClass = (field: string, required = false) =>
    `w-full pl-10 pr-4 py-3 bg-[#f4ead5] comic-border-thick font-semibold text-sm focus:outline-none focus:ring-2 ${
      touched[field] && fieldErrors[field]
        ? 'border-[#bb0013] ring-[#bb0013]'
        : 'focus:ring-[#bb0013]'
    }`;

  return (
    <div className="bg-white p-6 sm:p-8 comic-border-ultra shadow-comic-lg max-w-lg mx-auto space-y-6">
      <div className="border-b-4 border-[#1a1a1a] pb-3">
        <h3 className="font-anton text-2xl text-[#1a1a1a]">CREATE YOUR TEAM</h3>
        <p className="font-bricolage text-sm text-zinc-500 mt-1">Fill in your details as team leader</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 font-bricolage" noValidate>
        <div className="bg-[#f4ead5] p-3 comic-border-thick">
          <p className="text-xs text-zinc-500 font-bold uppercase">TEAM LEADER</p>
          <p className="font-anton text-lg text-[#1a1a1a]">{userProfile.displayName || user.displayName || user.email}</p>
          <p className="text-sm text-zinc-600">{userProfile.email || user.email}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2 font-bricolage text-sm">
            <p className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-zinc-400" />
              <span><span className="font-bold text-zinc-500">DOB:</span> {userProfile.dob || '-'}</span>
            </p>
            <p>
              <span className="font-bold text-zinc-500">Year:</span> {userProfile.year || '-'}
            </p>
            <p className="flex items-center gap-1.5 sm:col-span-2">
              {userProfile.diet === 'non-veg' ? (
                <Drumstick className="w-3.5 h-3.5 text-[#bb0013]" />
              ) : (
                <Salad className="w-3.5 h-3.5 text-[#00c853]" />
              )}
              <span className="font-bold text-zinc-500">Food:</span>{' '}
              {userProfile.diet === 'veg' ? 'Veg' : userProfile.diet === 'non-veg' ? 'Non-Veg' : '-'}
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <label className="block font-anton text-sm text-[#1a1a1a] uppercase">PHONE NUMBER *</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input type="tel" value={phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              onBlur={() => handleBlur('phone')}
              placeholder="+91 XXXX XXX XXX"
              className={inputClass('phone')} />
          </div>
          {touched['phone'] && fieldErrors['phone'] && (
            <p className="text-[#bb0013] text-xs font-bold flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 bg-[#bb0013] rounded-full" />
              {fieldErrors['phone']}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block font-anton text-sm text-[#1a1a1a] uppercase">BRANCH / STANDARD</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input type="text" value={branch}
              onChange={(e) => handleChange('branch', e.target.value)}
              placeholder="B.E. Robotics / B.Tech CSE"
              className={inputClass('branch')} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block font-anton text-sm text-[#1a1a1a] uppercase">COLLEGE / SCHOOL</label>
          <div className="relative">
            <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input type="text" value={college}
              onChange={(e) => handleChange('college', e.target.value)}
              placeholder="Park College of Engineering"
              className={inputClass('college')} />
          </div>
        </div>

        {error && (
          <p className="text-[#bb0013] font-bricolage text-sm font-semibold bg-red-50 p-2 comic-border-thick">{error}</p>
        )}

        <button type="submit" disabled={loading}
          className="w-full bg-[#bb0013] hover:bg-[#d90017] text-white font-anton text-xl py-3 comic-border-thick shadow-comic uppercase cursor-pointer disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          {loading ? 'CREATING...' : 'CREATE TEAM'}
        </button>
      </form>
    </div>
  );
};
