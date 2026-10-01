import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import { MemberDetails, Team, TeamMemberProfile } from '../types';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(): string {
  let code = '';
  for (let i = 0; i < 2; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  code += '-';
  for (let i = 0; i < 4; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}

async function isCodeUnique(code: string): Promise<boolean> {
  const q = query(collection(db, 'teams'), where('teamCode', '==', code));
  const snap = await getDocs(q);
  return snap.empty;
}

export async function generateTeamCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode();
    if (await isCodeUnique(code)) return code;
  }
  throw new Error('Failed to generate unique team code');
}

export async function createTeam(
  leaderUid: string,
  leaderName: string,
  leaderEmail: string,
  details: MemberDetails
): Promise<Team> {
  const teamCode = await generateTeamCode();
  const member: TeamMemberProfile = {
    uid: leaderUid,
    displayName: leaderName,
    email: leaderEmail,
    phone: details.phone,
    branch: details.branch,
    college: details.college,
    department: details.department,
    year: details.year,
    dob: details.dob,
    diet: details.diet,
    role: 'leader',
    joinedAt: new Date().toISOString(),
  };

  const teamData = {
    teamCode,
    teamName: details.teamName || `${leaderName}'s Team`,
    leader: { uid: leaderUid, displayName: leaderName, email: leaderEmail },
    members: [member],
    selectedTechEventId: '',
    selectedNonTechEventId: '',
    status: 'forming',
    registrationId: null,
    maxMembers: 4,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = doc(collection(db, 'teams'));
  await setDoc(docRef, teamData);

  // Update user profile with teamId
  await setDoc(doc(db, 'users', leaderUid), { teamId: docRef.id, updatedAt: serverTimestamp() }, { merge: true });

  return { id: docRef.id, ...teamData } as unknown as Team;
}

export async function getTeamByCode(teamCode: string): Promise<Team | null> {
  const q = query(collection(db, 'teams'), where('teamCode', '==', teamCode.toUpperCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as Team;
}

export async function getTeamById(teamId: string): Promise<Team | null> {
  const snap = await getDoc(doc(db, 'teams', teamId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Team) : null;
}

export async function joinTeamByCode(
  teamCode: string,
  uid: string,
  displayName: string,
  email: string,
  details: MemberDetails
): Promise<Team> {
  return runTransaction(db, async (transaction) => {
    const q = query(collection(db, 'teams'), where('teamCode', '==', teamCode.toUpperCase()));
    const snap = await getDocs(q);
    if (snap.empty) throw new Error('Team not found');

    const teamDoc = snap.docs[0];
    const teamData = teamDoc.data() as DocumentData;

    if (teamData.status !== 'forming') throw new Error('Team is no longer accepting members');
    if (teamData.members.length >= teamData.maxMembers) throw new Error('Team is full');
    if (teamData.members.some((m: any) => m.uid === uid)) throw new Error('You are already on this team');

    const newMember: TeamMemberProfile = {
      uid,
      displayName,
      email,
      phone: details.phone,
      branch: details.branch,
      college: details.college,
      department: details.department,
      year: details.year,
      dob: details.dob,
      diet: details.diet,
      role: 'member',
      joinedAt: new Date().toISOString(),
    };

    const updatedMembers = [...teamData.members, newMember];
    transaction.update(teamDoc.ref, {
      members: updatedMembers,
      updatedAt: serverTimestamp(),
    });

    transaction.set(doc(db, 'users', uid), { teamId: teamDoc.id, updatedAt: serverTimestamp() }, { merge: true });

    return { id: teamDoc.id, ...teamData, members: updatedMembers } as unknown as Team;
  });
}

export async function updateTeamEvents(
  teamId: string,
  techEventId: string,
  nonTechEventId: string
): Promise<void> {
  await updateDoc(doc(db, 'teams', teamId), {
    selectedTechEventId: techEventId,
    selectedNonTechEventId: nonTechEventId,
    updatedAt: serverTimestamp(),
  });
}

export async function removeMemberFromTeam(teamId: string, memberUid: string): Promise<void> {
  const teamSnap = await getDoc(doc(db, 'teams', teamId));
  if (!teamSnap.exists()) return;
  const team = teamSnap.data() as DocumentData;
  const updatedMembers = team.members.filter((m: any) => m.uid !== memberUid);
  await updateDoc(doc(db, 'teams', teamId), {
    members: updatedMembers,
    updatedAt: serverTimestamp(),
  });
  await setDoc(doc(db, 'users', memberUid), { teamId: null, updatedAt: serverTimestamp() }, { merge: true });
}

export async function leaveTeam(teamId: string, uid: string): Promise<void> {
  await removeMemberFromTeam(teamId, uid);
}

export async function deleteTeam(teamId: string): Promise<void> {
  const teamSnap = await getDoc(doc(db, 'teams', teamId));
  if (!teamSnap.exists()) return;
  const team = teamSnap.data() as DocumentData;
  for (const member of team.members) {
    await setDoc(doc(db, 'users', member.uid), { teamId: null, updatedAt: serverTimestamp() }, { merge: true });
  }
  await deleteDoc(doc(db, 'teams', teamId));
}

export function subscribeToTeam(teamId: string, callback: (team: Team | null) => void): () => void {
  return onSnapshot(doc(db, 'teams', teamId), (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() } as Team);
    } else {
      callback(null);
    }
  });
}
