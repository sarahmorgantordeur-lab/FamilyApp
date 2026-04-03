import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setSession(user ? { user } : null);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function signIn(email, password) {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return null;
    } catch (e) {
      return { message: firebaseError(e.code) };
    }
  }

  async function signUp(email, password, displayName) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) await updateProfile(cred.user, { displayName });
      return null;
    } catch (e) {
      return { message: firebaseError(e.code) };
    }
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

function firebaseError(code) {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Email ou mot de passe incorrect.';
    case 'auth/email-already-in-use': return 'Cet email est déjà utilisé.';
    case 'auth/weak-password': return 'Mot de passe trop court (6 caractères min).';
    case 'auth/invalid-email': return 'Email invalide.';
    default: return 'Une erreur est survenue. Réessaie.';
  }
}
