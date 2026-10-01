import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { DietPreference, UserProfile } from '../types';
import { updateUserProfile } from '../services/userProfile';
import {
  Loader2,
  User as UserIcon,
  Phone,
  CalendarDays,
  Building2,
  GraduationCap,
  Salad,
  Drumstick,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

interface OnboardingFormProps {
  user: User;
  userProfile: UserProfile;
  onComplete: () => void;
}

const YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th / Postgrad'];

const STEP_FIELDS: string[][] = [
  ['displayName', 'phone', 'dob'],
  ['department', 'year', 'college', 'diet'],
];

export const OnboardingForm: React.FC<OnboardingFormProps> = ({ user, userProfile, onComplete }) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    displayName: userProfile.displayName && userProfile.displayName !== 'User' ? userProfile.displayName : user.displayName || '',
    phone: userProfile.phone || '',
    dob: userProfile.dob || '',
    department: userProfile.department || userProfile.branch || '',
    year: userProfile.year || '',
    college: userProfile.college || '',
    diet: (userProfile.diet || '') as DietPreference | '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateField = (field: string, value: string) => {
    let msg = '';
    const v = value.trim();
    if (field === 'displayName') {
      if (!v) msg = 'Full name is required';
      else if (v.length < 3) msg = 'Enter your full name';
    } else if (field === 'phone') {
      if (!v) msg = 'Phone number is required';
      else if (!/^[+\d\s-]{7,15}$/.test(v)) msg = 'Enter a valid phone number';
    } else if (field === 'dob') {
      if (!v) msg = 'Date of birth is required';
      else {
        const picked = new Date(v);
        if (Number.isNaN(picked.getTime())) msg = 'Enter a valid date';
        else {
          const today = new Date();
          let age = today.getFullYear() - picked.getFullYear();
          const beforeBirthday =
            today.getMonth() < picked.getMonth() ||
            (today.getMonth() === picked.getMonth() && today.getDate() < picked.getDate());
          if (beforeBirthday) age -= 1;
          if (picked.getTime() >= today.getTime()) msg = 'Date of birth must be in the past';
          else if (age < 15) msg = 'You must be at least 15 years old';
          else if (age > 100) msg = 'Enter a valid date of birth';
        }
      }
    } else if (field === 'department') {
      if (!v) msg = 'Department is required';
    } else if (field === 'year') {
      if (!v) msg = 'Select your year';
    } else if (field === 'college') {
      if (!v) msg = 'College is required';
    } else if (field === 'diet') {
      if (!v) msg = 'Select veg or non-veg';
    }
    setFieldErrors(prev => ({ ...prev, [field]: msg }));
    return msg;
  };

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (touched[field]) validateField(field, value);
    setError('');
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, form[field as keyof typeof form]);
  };

  const validateStep = (target: number) => {
    const nextTouched = { ...touched };
    const nextErrors = { ...fieldErrors };
    let hasError = false;
    for (const field of STEP_FIELDS[target]) {
      nextTouched[field] = true;
      const msg = validateField(field, String(form[field as keyof typeof form] ?? ''));
      nextErrors[field] = msg;
      if (msg) hasError = true;
    }
    setTouched(nextTouched);
    setFieldErrors(nextErrors);
    return !hasError;
  };

  const handleNext = () => {
    if (!validateStep(0)) return;
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setStep(0);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1)) return;

    setLoading(true);
    setError('');
    try {
      await updateUserProfile(user.uid, {
        displayName: form.displayName.trim(),
        phone: form.phone.trim(),
        dob: form.dob,
        department: form.department.trim(),
        branch: form.department.trim(),
        year: form.year,
        college: form.college.trim(),
        diet: form.diet as DietPreference,
        profileCompleted: true,
      });
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Could not save your details. Try again.');
      setLoading(false);
    }
  };

  const inputClass = (field: string, withIcon = true) =>
    `w-full ${withIcon ? 'pl-10 pr-4' : 'px-4'} py-3 bg-[#f4ead5] comic-border-thick font-semibold text-sm focus:outline-none focus:ring-2 ${
      touched[field] && fieldErrors[field]
        ? 'border-[#bb0013] ring-[#bb0013]'
        : 'focus:ring-[#bb0013]'
    }`;

  const FieldError: React.FC<{ field: string }> = ({ field }) =>
    touched[field] && fieldErrors[field] ? (
      <p className="text-[#bb0013] text-xs font-bold flex items-center gap-1">
        <span className="inline-block w-1.5 h-1.5 bg-[#bb0013] rounded-full" />
        {fieldErrors[field]}
      </p>
    ) : null;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <div className="bg-white p-6 sm:p-8 comic-border-ultra shadow-comic-lg max-w-lg w-full space-y-6">
        <div className="bg-[#1a1a1a] text-white p-4 comic-border-thick font-anton text-2xl tracking-wider text-center">
          COMPLETE YOUR PROFILE
        </div>

        <div className="text-center space-y-2">
          <p className="font-bricolage text-sm text-zinc-600">
            Signed in as <span className="font-bold text-[#1a1a1a]">{user.email}</span>
          </p>
          <p className="font-bricolage text-sm text-zinc-600">
            We need a few details before you register for Robotron 2027.
          </p>
        </div>

        <div>
          <div className="flex justify-between items-center font-anton text-xs text-zinc-500 uppercase mb-1">
            <span>Step {step + 1} of 2</span>
            <span>{step === 0 ? 'About you' : 'Academics & food'}</span>
          </div>
          <div className="h-3 bg-[#f4ead5] comic-border-thick overflow-hidden">
            <div
              className="h-full bg-[#bb0013] transition-all duration-300"
              style={{ width: step === 0 ? '50%' : '100%' }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-bricolage" noValidate>
          {step === 0 && (
            <>
              <div className="space-y-1">
                <label className="block font-anton text-sm text-[#1a1a1a] uppercase">FULL NAME *</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={form.displayName}
                    onChange={(e) => handleChange('displayName', e.target.value)}
                    onBlur={() => handleBlur('displayName')}
                    placeholder="Tony Stark"
                    className={inputClass('displayName')}
                  />
                </div>
                <FieldError field="displayName" />
              </div>

              <div className="space-y-1">
                <label className="block font-anton text-sm text-[#1a1a1a] uppercase">PHONE NUMBER *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    onBlur={() => handleBlur('phone')}
                    placeholder="+91 XXXX XXX XXX"
                    className={inputClass('phone')}
                  />
                </div>
                <FieldError field="phone" />
              </div>

              <div className="space-y-1">
                <label className="block font-anton text-sm text-[#1a1a1a] uppercase">DATE OF BIRTH *</label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="date"
                    value={form.dob}
                    onChange={(e) => handleChange('dob', e.target.value)}
                    onBlur={() => handleBlur('dob')}
                    className={inputClass('dob')}
                  />
                </div>
                <FieldError field="dob" />
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="w-full bg-[#bb0013] hover:bg-[#d90017] text-white font-anton text-xl py-3 comic-border-thick shadow-comic uppercase cursor-pointer transition-colors flex items-center justify-center gap-2"
              >
                NEXT
                <ArrowRight className="w-5 h-5" />
              </button>
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-1">
                <label className="block font-anton text-sm text-[#1a1a1a] uppercase">DEPARTMENT *</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={form.department}
                    onChange={(e) => handleChange('department', e.target.value)}
                    onBlur={() => handleBlur('department')}
                    placeholder="CSE / Mechanical / BBA"
                    className={inputClass('department')}
                  />
                </div>
                <FieldError field="department" />
              </div>

              <div className="space-y-1">
                <label className="block font-anton text-sm text-[#1a1a1a] uppercase">YEAR *</label>
                <select
                  value={form.year}
                  onChange={(e) => handleChange('year', e.target.value)}
                  onBlur={() => handleBlur('year')}
                  className={`${inputClass('year', false)} cursor-pointer`}
                >
                  <option value="">-- SELECT YEAR --</option>
                  {YEAR_OPTIONS.map(y => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <FieldError field="year" />
              </div>

              <div className="space-y-1">
                <label className="block font-anton text-sm text-[#1a1a1a] uppercase">COLLEGE / SCHOOL *</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={form.college}
                    onChange={(e) => handleChange('college', e.target.value)}
                    onBlur={() => handleBlur('college')}
                    placeholder="Park College of Engineering"
                    className={inputClass('college')}
                  />
                </div>
                <FieldError field="college" />
              </div>

              <div className="space-y-1">
                <label className="block font-anton text-sm text-[#1a1a1a] uppercase">FOOD PREFERENCE *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleChange('diet', 'veg')}
                    className={`flex items-center justify-center gap-2 py-3 comic-border-thick font-anton text-sm uppercase cursor-pointer transition-colors ${
                      form.diet === 'veg'
                        ? 'bg-[#00c853] text-white shadow-comic-sm'
                        : 'bg-[#f4ead5] text-[#1a1a1a] hover:bg-[#efe1c5]'
                    }`}
                  >
                    <Salad className="w-4 h-4" />
                    VEG
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('diet', 'non-veg')}
                    className={`flex items-center justify-center gap-2 py-3 comic-border-thick font-anton text-sm uppercase cursor-pointer transition-colors ${
                      form.diet === 'non-veg'
                        ? 'bg-[#bb0013] text-white shadow-comic-sm'
                        : 'bg-[#f4ead5] text-[#1a1a1a] hover:bg-[#efe1c5]'
                    }`}
                  >
                    <Drumstick className="w-4 h-4" />
                    NON-VEG
                  </button>
                </div>
                <FieldError field="diet" />
              </div>

              {error && (
                <p className="text-[#bb0013] font-bricolage text-sm font-semibold bg-red-50 p-2 comic-border-thick">
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="w-1/3 bg-[#1a1a1a] hover:bg-[#333] text-white font-anton text-lg py-3 comic-border-thick shadow-comic-sm uppercase cursor-pointer transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  BACK
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#bb0013] hover:bg-[#d90017] text-white font-anton text-xl py-3 comic-border-thick shadow-comic uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                  {loading ? 'SAVING...' : 'SAVE & CONTINUE'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
