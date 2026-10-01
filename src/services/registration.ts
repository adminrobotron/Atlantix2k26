import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { DietPreference } from '../types';

interface MemberData {
  fullName: string;
  dob: string;
  phone: string;
  email: string;
  branch: string;
  college: string;
  year?: string;
  diet?: DietPreference | '';
}

interface RegistrationPayload {
  members: MemberData[];
  technicalEvent: string;
  nonTechnicalEvent: string;
  totalFee: number;
  teamId?: string;
  teamCode?: string;
}

export function generateRegistrationId(): string {
  return 'AUTO' + Math.floor(100000 + Math.random() * 900000);
}

export async function saveRegistration(
  regId: string,
  data: RegistrationPayload
): Promise<void> {
  const activeMembers = data.members
    .filter(m => m.fullName.trim() !== '')
    .map((m, i) => ({
      name: m.fullName,
      email: m.email,
      phone: m.phone,
      branch: m.branch,
      college: m.college,
      dob: m.dob || '',
      year: m.year || '',
      diet: m.diet || '',
      memberId: `${regId}-M${i + 1}`,
      checkedIn: false,
    }));

  await setDoc(doc(db, 'registrations', regId), {
    registrationId: regId,
    teamId: data.teamId || null,
    teamCode: data.teamCode || null,
    teamLead: data.members[0].fullName,
    leadEmail: data.members[0].email,
    members: activeMembers,
    technicalEvent: data.technicalEvent || 'None',
    additionalEvent: data.nonTechnicalEvent || 'None',
    amount: data.totalFee,
    checkedIn: false,
    timestamp: serverTimestamp(),
  });
}
