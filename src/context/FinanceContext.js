import { createContext, useContext, useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const FinanceContext = createContext(null);

function parseAmount(value) {
  if (typeof value === 'number') return value;
  return parseFloat(String(value).replace(',', '.'));
}

// Catégories de dépenses
export const EXPENSE_CATEGORIES = [
  { key: 'charges',    label: 'Charges',    emoji: '🏠', color: '#6366F1' },
  { key: 'nourriture', label: 'Nourriture', emoji: '🛒', color: '#F59E0B' },
  { key: 'loisirs',    label: 'Loisirs',    emoji: '🎉', color: '#EC4899' },
  { key: 'voiture',    label: 'Voiture',    emoji: '🚗', color: '#14B8A6' },
  { key: 'sante',      label: 'Santé',      emoji: '❤️', color: '#EF4444' },
  { key: 'assurances', label: 'Assurances', emoji: '🛡️', color: '#8B5CF6' },
  { key: 'animaux',    label: 'Animaux',    emoji: '🐾', color: '#F97316' },
  { key: 'autre',     label: 'Autre',      emoji: '📦', color: '#6B7280' },
];

// Comptes principaux fixes
export const MAIN_ACCOUNTS = [
  { key: 'landelin', name: 'Landelin', color: '#5B5BD6', emoji: '👤' },
  { key: 'sarah',    name: 'Sarah',    color: '#E5534B', emoji: '👤' },
  { key: 'commun',   name: 'Commun',   color: '#30A46C', emoji: '🏠' },
];

export function FinanceProvider({ children, householdId }) {
  const [accounts, setAccounts] = useState([]);         // comptes épargne
  const [mainMeta, setMainMeta] = useState([]);         // métadonnées comptes principaux
  const [transactions, setTransactions] = useState([]); // toutes les transactions
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId) {
      setAccounts([]); setMainMeta([]); setTransactions([]); setLoading(false);
      return;
    }

    // Comptes épargne
    const qAccounts = query(
      collection(db, 'financeAccounts'),
      where('householdId', '==', householdId)
    );
    // Métadonnées comptes principaux (numéro de compte, etc.)
    const qMainMeta = query(
      collection(db, 'financeMainMeta'),
      where('householdId', '==', householdId)
    );
    // Transactions — pas d'orderBy pour éviter l'index composite ; tri côté client
    const qTransactions = query(
      collection(db, 'financeTransactions'),
      where('householdId', '==', householdId)
    );

    const unsubAccounts = onSnapshot(qAccounts, (snap) => {
      setAccounts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      console.error('financeAccounts snapshot error:', error);
      setLoading(false);
    });

    const unsubMainMeta = onSnapshot(qMainMeta, (snap) => {
      setMainMeta(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error('financeMainMeta snapshot error:', error);
    });

    const unsubTx = onSnapshot(qTransactions, (snap) => {
      const txs = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          if (a.date !== b.date) return a.date > b.date ? -1 : 1;
          // Même date : plus récent en premier via createdAt
          const aTs = a.createdAt?.seconds ?? 0;
          const bTs = b.createdAt?.seconds ?? 0;
          return bTs - aTs;
        });
      setTransactions(txs);
    }, (error) => {
      console.error('financeTransactions snapshot error:', error);
    });

    return () => { unsubAccounts(); unsubMainMeta(); unsubTx(); };
  }, [householdId]);

  // Récupère les métadonnées d'un compte principal (numéro de compte…)
  function getMainMeta(accountKey) {
    return mainMeta.find((m) => m.key === accountKey) || null;
  }

  // Met à jour les métadonnées d'un compte principal (numéro, notes…)
  async function updateMainMeta(accountKey, data) {
    const existing = mainMeta.find((m) => m.key === accountKey);
    if (existing) {
      await updateDoc(doc(db, 'financeMainMeta', existing.id), data);
    } else {
      await addDoc(collection(db, 'financeMainMeta'), {
        householdId,
        key: accountKey,
        ...data,
      });
    }
  }

  // Timestamp d'une transaction en millisecondes (pour comparaisons)
  function txTs(t) {
    if (t.createdAt?.seconds) return t.createdAt.seconds * 1000 + (t.createdAt.nanoseconds ?? 0) / 1e6;
    if (t.date) return new Date(t.date).getTime();
    return 0;
  }

  // Calcule le solde à partir des transactions d'un compte
  function computeBalance(txs) {
    // Ajustement le plus récent (timestamp le plus élevé)
    const adjustments = txs.filter((t) => t.type === 'adjustment');
    if (adjustments.length === 0) {
      return txs.reduce((sum, t) => {
        if (t.type === 'income') return sum + (t.amount || 0);
        if (t.type === 'expense') return sum - (t.amount || 0);
        return sum;
      }, 0);
    }
    const lastAdj = adjustments.reduce((best, t) => txTs(t) > txTs(best) ? t : best);
    const adjTs = txTs(lastAdj);
    // Uniquement les revenus/dépenses créés APRÈS l'ajustement
    const afterAdj = txs.filter((t) => t.type !== 'adjustment' && txTs(t) > adjTs);
    return afterAdj.reduce((sum, t) => {
      if (t.type === 'income') return sum + (t.amount || 0);
      if (t.type === 'expense') return sum - (t.amount || 0);
      return sum;
    }, lastAdj.amount || 0);
  }

  // Calcule le solde d'un compte principal à partir de ses transactions
  function getBalance(accountKey) {
    return computeBalance(transactions.filter((t) => t.accountKey === accountKey));
  }

  // Calcule le solde d'un compte épargne
  function getSavingsBalance(accountId) {
    return computeBalance(transactions.filter((t) => t.accountId === accountId));
  }

  // Total général (comptes principaux + épargne)
  function getTotalBalance() {
    const mainTotal = MAIN_ACCOUNTS.reduce((sum, a) => sum + getBalance(a.key), 0);
    const savingsTotal = accounts.reduce((sum, a) => sum + getSavingsBalance(a.id), 0);
    return mainTotal + savingsTotal;
  }

  // Ajouter une transaction sur un compte principal
  async function addMainTransaction({ accountKey, type, amount, date, description, category = null }) {
    await addDoc(collection(db, 'financeTransactions'), {
      householdId,
      accountKey,
      accountId: null,
      type,
      amount: parseAmount(amount),
      date,
      description: description || '',
      category: type === 'expense' ? (category || 'autre') : null,
      createdAt: serverTimestamp(),
    });
  }

  // Mettre à jour le solde d'un compte principal (ajustement)
  async function setMainBalance(accountKey, newBalance) {
    await addDoc(collection(db, 'financeTransactions'), {
      householdId,
      accountKey,
      accountId: null,
      type: 'adjustment',
      amount: parseAmount(newBalance),
      date: new Date().toISOString().split('T')[0],
      description: 'Mise à jour du solde',
      createdAt: serverTimestamp(),
    });
  }

  // Ajouter une transaction sur un compte épargne
  async function addSavingsTransaction({ accountId, type, amount, date, description, category = null }) {
    await addDoc(collection(db, 'financeTransactions'), {
      householdId,
      accountKey: null,
      accountId,
      type,
      amount: parseAmount(amount),
      date,
      description: description || '',
      category: type === 'expense' ? (category || 'autre') : null,
      createdAt: serverTimestamp(),
    });
  }

  // Mettre à jour le solde d'un compte épargne (ajustement)
  async function setSavingsBalance(accountId, newBalance) {
    await addDoc(collection(db, 'financeTransactions'), {
      householdId,
      accountKey: null,
      accountId,
      type: 'adjustment',
      amount: parseAmount(newBalance),
      date: new Date().toISOString().split('T')[0],
      description: 'Mise à jour du solde',
      createdAt: serverTimestamp(),
    });
  }

  // Supprimer une transaction
  async function deleteTransaction(id) {
    await deleteDoc(doc(db, 'financeTransactions', id));
  }

  // Ajouter un compte épargne
  async function addSavingsAccount(name, color = '#7B7BF8', accountNumber = '') {
    await addDoc(collection(db, 'financeAccounts'), {
      householdId,
      name,
      color,
      accountNumber,
      createdAt: serverTimestamp(),
    });
  }

  // Mettre à jour un compte épargne (nom, couleur, numéro)
  async function updateSavingsAccount(accountId, data) {
    await updateDoc(doc(db, 'financeAccounts', accountId), data);
  }

  // Supprimer un compte épargne (et ses transactions)
  async function deleteSavingsAccount(accountId) {
    const q = query(
      collection(db, 'financeTransactions'),
      where('householdId', '==', householdId),
      where('accountId', '==', accountId)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, 'financeAccounts', accountId));
    await batch.commit();
  }

  return (
    <FinanceContext.Provider value={{
      accounts,
      transactions,
      loading,
      getMainMeta,
      updateMainMeta,
      getBalance,
      getSavingsBalance,
      getTotalBalance,
      addMainTransaction,
      setMainBalance,
      addSavingsTransaction,
      setSavingsBalance,
      deleteTransaction,
      addSavingsAccount,
      updateSavingsAccount,
      deleteSavingsAccount,
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() { return useContext(FinanceContext); }
