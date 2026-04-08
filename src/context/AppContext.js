import { createContext, useContext, useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import {
  requestNotificationPermission,
  notifyTaskDone,
  scheduleEventReminders,
  clearAllReminders,
  scheduleTaskReminders,
  clearAllTaskReminders,
} from '../lib/notifications';

const AppContext = createContext(null);

function normalizeEvent(event) {
  return {
    ...event,
    ownerId: event.ownerId || event.owner_id || null,
    householdId: event.householdId || event.household_id || null,
    isShared: typeof event.isShared === 'boolean' ? event.isShared : !!event.is_shared,
  };
}

function normalizeList(list) {
  return {
    ...list,
    ownerId: list.ownerId || list.owner_id || null,
    householdId: list.householdId || list.household_id || null,
    isShared: typeof list.isShared === 'boolean' ? list.isShared : !!list.is_shared,
    items: Array.isArray(list.items) ? list.items : [],
  };
}

export const IMPORTANCE = {
  low:      { label: 'Faible',    color: '#4ADE80' },
  normal:   { label: 'Normal',    color: '#7B7BF8' },
  high:     { label: 'Important', color: '#FB923C' },
  critical: { label: 'Urgent',    color: '#F87171' },
};

function normalizeListDocItem(item, list) {
  return {
    id: item.id || `embedded-${Math.random().toString(36).slice(2, 8)}`,
    text: item.text || '',
    checked: !!item.checked,
    dueDate: item.dueDate ?? item.due_date ?? null,
    createdAt: item.createdAt ?? item.created_at ?? new Date().toISOString(),
    listId: list.id,
    ownerId: item.ownerId || item.owner_id || list.ownerId || null,
    householdId: item.householdId || item.household_id || list.householdId || null,
    isShared: typeof item.isShared === 'boolean' ? item.isShared : !!item.is_shared || !!list.isShared,
  };
}

export function AppProvider({ children, householdId }) {
  const { session } = useAuth();
  const uid = session?.user?.uid;
  const [lists, setLists]   = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  function handleSnapshotError(error, onFallback) {
    console.error('Firestore snapshot error:', error);
    onFallback?.();
    setLoading(false);
  }

  // Demande la permission de notifications au premier chargement
  useEffect(() => { requestNotificationPermission(); }, []);

  // Planifie les rappels dès que les événements changent
  useEffect(() => {
    scheduleEventReminders(events);
    return () => clearAllReminders();
  }, [events]);

  // Planifie les rappels de tâches dès que les listes changent
  useEffect(() => {
    const allItems = lists.flatMap((l) => l.items || []);
    scheduleTaskReminders(allItems);
    return () => clearAllTaskReminders();
  }, [lists]);

  useEffect(() => {
    if (!uid) { setLists([]); setEvents([]); setLoading(false); return; }

    // --- Lists: own + shared within household ---
    const qOwn    = query(collection(db, 'lists'), where('ownerId', '==', uid));
    const qShared = householdId
      ? query(collection(db, 'lists'), where('householdId', '==', householdId), where('isShared', '==', true))
      : null;

    const listsMap = { own: [], shared: [] };
    let itemsUnsubs = [];
    const migratedEmbeddedLists = new Set();

    function mergeLists() {
      const seen = new Set();
      const merged = [...listsMap.own, ...listsMap.shared].filter((l) => {
        if (seen.has(l.id)) return false;
        seen.add(l.id);
        return true;
      });
      merged.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setLists(merged);
      setLoading(false);
    }

    function subscribeItems(listDocs, key) {
      itemsUnsubs
        .filter((entry) => entry.key === key)
        .forEach((entry) => entry.unsub());
      itemsUnsubs = itemsUnsubs.filter((entry) => entry.key !== key);

      const updatedLists = listDocs.map((l) => ({
        ...l,
        items: l.isShared ? [] : (l.items || []),
      }));
      listsMap[key] = updatedLists;

      updatedLists.forEach((list) => {
        const q = query(
          collection(db, 'lists', list.id, 'items'),
          orderBy('createdAt', 'asc')
        );
        const unsub = onSnapshot(q, (snap) => {
          const itemsFromSubcollection = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          const embeddedItems = list.isShared && Array.isArray(list.items)
            ? list.items.map((item) => normalizeListDocItem(item, list))
            : [];

          if (
            list.isShared &&
            itemsFromSubcollection.length === 0 &&
            embeddedItems.length > 0 &&
            !migratedEmbeddedLists.has(list.id)
          ) {
            migratedEmbeddedLists.add(list.id);
            embeddedItems.forEach((item) => {
              setDoc(doc(db, 'lists', list.id, 'items', item.id), {
                text: item.text,
                checked: item.checked,
                dueDate: item.dueDate ?? null,
                createdAt: item.createdAt ?? new Date().toISOString(),
                listId: list.id,
                ownerId: item.ownerId || list.ownerId || null,
                householdId: list.householdId || null,
                isShared: true,
              }).catch((error) => {
                console.error('Embedded item migration error:', error);
              });
            });
          }

          const items = itemsFromSubcollection;

          if (list.isShared && list.ownerId === uid) {
            snap.docs.forEach((itemDoc) => {
              const data = itemDoc.data();
              if (data.householdId !== list.householdId || data.isShared !== true || data.listId !== list.id) {
                updateDoc(itemDoc.ref, {
                  listId: list.id,
                  householdId: list.householdId || null,
                  isShared: true,
                  ownerId: list.ownerId,
                }).catch((error) => {
                  console.error('Item backfill error:', error);
                });
              }
            });
          }

          listsMap[key] = listsMap[key].map((l) =>
            l.id === list.id ? { ...l, items } : l
          );
          mergeLists();
        }, (error) => handleSnapshotError(error, () => {
          listsMap[key] = listsMap[key].map((l) =>
            l.id === list.id ? { ...l, items: [] } : l
          );
          mergeLists();
        }));
        itemsUnsubs.push({ key, unsub });
      });

      mergeLists();
    }

    const unsubOwn = onSnapshot(qOwn, (snap) => {
      const docs = snap.docs.map((d) => normalizeList({ id: d.id, ...d.data() }));
      subscribeItems(docs, 'own');
    }, (error) => handleSnapshotError(error, () => {
      listsMap.own = [];
      mergeLists();
    }));

    let unsubShared = () => {};
    if (qShared) {
      unsubShared = onSnapshot(qShared, (snap) => {
        const docs = snap.docs.map((d) => normalizeList({ id: d.id, ...d.data() }));
        const filtered = docs.filter((d) => d.isShared && d.ownerId !== uid);
        subscribeItems(filtered, 'shared');
      }, (error) => handleSnapshotError(error, () => {
        listsMap.shared = [];
        mergeLists();
      }));
    }

    // --- Events: own + household events ---
    // No orderBy to avoid requiring composite indexes; sorted client-side in mergeEvents()
    const qEvOwn = query(collection(db, 'events'), where('ownerId', '==', uid));
    const qEvHousehold = householdId
      ? query(collection(db, 'events'), where('householdId', '==', householdId), where('isShared', '==', true))
      : null;

    const eventsMap = { own: [], household: [] };
    function mergeEvents() {
      const seen = new Set();
      const merged = [
        ...eventsMap.own,
        ...eventsMap.household,
      ].filter((e) => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      });
      merged.sort((a, b) => (a.date > b.date ? 1 : -1));
      setEvents(merged);
    }

    const unsubEvOwn = onSnapshot(qEvOwn, (snap) => {
      eventsMap.own = snap.docs.map((d) => normalizeEvent({ id: d.id, ...d.data() }));
      mergeEvents();
    }, (error) => handleSnapshotError(error, () => {
      eventsMap.own = [];
      mergeEvents();
    }));

    let unsubEvHousehold = () => {};
    if (qEvHousehold) {
      unsubEvHousehold = onSnapshot(qEvHousehold, (snap) => {
        eventsMap.household = snap.docs.map((d) => normalizeEvent({ id: d.id, ...d.data() }));
        mergeEvents();
      }, (error) => handleSnapshotError(error, () => {
        eventsMap.household = [];
        mergeEvents();
      }));
    }

    return () => {
      unsubOwn(); unsubShared();
      unsubEvOwn();
      unsubEvHousehold();
      itemsUnsubs.forEach((entry) => entry.unsub());
    };
  }, [uid, householdId]);

  // --- Lists ---
  async function addList(name, options = {}) {
    const isShared = !!options.isShared;
    const listRef = await addDoc(collection(db, 'lists'), {
      name,
      ownerId: uid,
      householdId: isShared ? (options.householdId ?? householdId ?? null) : null,
      isShared,
      createdAt: serverTimestamp(),
    });
    return listRef.id;
  }
  async function deleteList(id) {
    const itemsQuery = query(collection(db, 'lists', id, 'items'));
    const itemsSnap = await getDocs(itemsQuery);
    await Promise.all(itemsSnap.docs.map((itemDoc) => deleteDoc(itemDoc.ref)));
    await deleteDoc(doc(db, 'lists', id));
  }
  async function renameList(id, name) {
    await updateDoc(doc(db, 'lists', id), { name });
  }
  async function toggleShared(id, current) {
    const nextShared = !current;
    const nextHouseholdId = nextShared ? (householdId || null) : null;
    const list = lists.find((entry) => entry.id === id);

    await updateDoc(doc(db, 'lists', id), {
      isShared: nextShared,
      householdId: nextHouseholdId,
      items: nextShared
        ? (list?.items || []).map((item) => ({
            ...item,
            ownerId: item.ownerId || item.owner_id || list?.ownerId || uid,
            householdId: nextHouseholdId,
            isShared: true,
          }))
        : (list?.items || []).map((item) => ({
            ...item,
            householdId: null,
            isShared: false,
          })),
    });

    const itemsQuery = query(collection(db, 'lists', id, 'items'), orderBy('createdAt', 'asc'));
    const itemsSnap = await getDocs(itemsQuery);
    await Promise.all(itemsSnap.docs.map((itemDoc) =>
      updateDoc(itemDoc.ref, {
        listId: id,
        ownerId: itemDoc.data().ownerId || itemDoc.data().owner_id || list?.ownerId || uid,
        householdId: nextHouseholdId,
        isShared: nextShared,
      })
    ));
  }

  // --- Items ---
  async function addItem(listId, text) {
    const list = lists.find((entry) => entry.id === listId);
    const newItem = {
      text,
      checked: false,
      dueDate: null,
      createdAt: new Date().toISOString(),
      listId,
      ownerId: list?.ownerId || uid,
      householdId: list?.isShared ? (list.householdId || householdId || null) : null,
      isShared: !!list?.isShared,
    };

    const itemRef = await addDoc(collection(db, 'lists', listId, 'items'), {
      ...newItem,
      createdAt: serverTimestamp(),
    });
    return itemRef.id;
  }
  async function toggleItem(itemId, listId, current) {
    await updateDoc(doc(db, 'lists', listId, 'items', itemId), { checked: !current });
    if (!current) {
      const item = lists.find((l) => l.id === listId)?.items?.find((i) => i.id === itemId);
      if (item?.text) notifyTaskDone(item.text);
    }
  }
  async function deleteItem(itemId, listId) {
    await deleteDoc(doc(db, 'lists', listId, 'items', itemId));
  }
  async function uncheckAll(listId, items) {
    await Promise.all(
      items.filter((i) => i.checked).map((i) =>
        updateDoc(doc(db, 'lists', listId, 'items', i.id), { checked: false })
      )
    );
  }
  async function setItemDueDate(itemId, listId, dueDate) {
    await updateDoc(doc(db, 'lists', listId, 'items', itemId), { dueDate });
  }
  async function setItemReminder(itemId, listId, reminderAt) {
    await updateDoc(doc(db, 'lists', listId, 'items', itemId), { reminderAt: reminderAt || null });
  }

  // --- Events ---
  async function addEvent(data) {
    await addDoc(collection(db, 'events'), {
      ...data,
      ownerId: uid,
      householdId: householdId || null,
      isShared: !!householdId || !!data.isShared,
      createdAt: serverTimestamp(),
    });
  }
  async function updateEvent(id, data) {
    await updateDoc(doc(db, 'events', id), {
      ...data,
      householdId: householdId || null,
      isShared: !!householdId || !!data.isShared,
    });
  }
  async function deleteEvent(id) {
    await deleteDoc(doc(db, 'events', id));
  }

  return (
    <AppContext.Provider value={{
      lists, events, loading,
      addList, deleteList, renameList, toggleShared,
      addItem, toggleItem, deleteItem, uncheckAll, setItemDueDate, setItemReminder,
      addEvent, updateEvent, deleteEvent,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() { return useContext(AppContext); }
