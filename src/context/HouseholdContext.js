import { createContext, useContext, useEffect, useState } from 'react';
import {
  arrayUnion,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';

const HouseholdContext = createContext(null);

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function HouseholdProvider({ children }) {
  const { session } = useAuth();
  const uid = session?.user?.uid;
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setHousehold(null); setMembers([]); setLoading(false); return; }

    const userRef = doc(db, 'users', uid);

    const unsub = onSnapshot(userRef, async (snap) => {
      const userData = snap.data();
      if (userData?.householdId) {
        const hSnap = await getDoc(doc(db, 'households', userData.householdId));
        if (!hSnap.exists()) { setHousehold(null); setMembers([]); setLoading(false); return; }
        const hData = { id: userData.householdId, ...hSnap.data() };
        setHousehold(hData);
        // memberData is a map { [uid]: { displayName, email } } stored in the household doc
        const memberData = hData.memberData || {};
        // Backfill own info if missing (migration for households created before this field existed)
        if (!memberData[uid]) {
          updateDoc(doc(db, 'households', hData.id), {
            [`memberData.${uid}`]: {
              email: session.user.email,
              displayName: session.user.displayName || null,
            },
          });
        }
        setMembers(
          (hData.members || []).map((mUid) => ({
            uid: mUid,
            displayName: memberData[mUid]?.displayName || null,
            email: memberData[mUid]?.email || mUid,
          }))
        );
      } else {
        setHousehold(null);
        setMembers([]);
      }
      setLoading(false);
    });

    // Create user doc if missing
    getDoc(userRef).then((snap) => {
      if (!snap.exists()) {
        setDoc(userRef, {
          email: session.user.email,
          displayName: session.user.displayName || null,
          householdId: null,
        });
      }
    });

    return unsub;
  }, [uid]);

  async function createHousehold() {
    const code = generateCode();
    const hRef = doc(collection(db, 'households'));
    const displayName = session.user.displayName || null;
    const email = session.user.email;
    await setDoc(hRef, {
      code,
      members: [uid],
      memberData: { [uid]: { email, displayName } },
      createdAt: new Date().toISOString(),
    });
    await updateDoc(doc(db, 'users', uid), { householdId: hRef.id });
  }

  async function joinHousehold(code) {
    const q = query(collection(db, 'households'), where('code', '==', code.toUpperCase()));
    const snap = await getDocs(q);
    if (snap.empty) return 'Code invalide.';

    const hDoc = snap.docs[0];
    const displayName = session.user.displayName || null;
    const email = session.user.email;
    await updateDoc(hDoc.ref, {
      members: arrayUnion(uid),
      [`memberData.${uid}`]: { email, displayName },
    });
    await updateDoc(doc(db, 'users', uid), { householdId: hDoc.id });
    return null;
  }

  return (
    <HouseholdContext.Provider value={{ household, members, loading, createHousehold, joinHousehold }}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() { return useContext(HouseholdContext); }
