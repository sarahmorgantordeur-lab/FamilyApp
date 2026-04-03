import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { useTheme } from '../context/ThemeContext';

const LEGACY_GROCERY_LIST_NAME = '🛒 Liste de courses';

function createItemId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function GroceryScreen() {
  const { colors } = useTheme();
  const { lists } = useApp();
  const { session } = useAuth();
  const { household } = useHousehold();
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pendingItems, setPendingItems] = useState(null);
  const [hasGroceryItemsField, setHasGroceryItemsField] = useState(false);

  useEffect(() => {
    if (!household?.id) {
      setItems([]);
      return;
    }

    const householdRef = doc(db, 'households', household.id);
    const unsub = onSnapshot(householdRef, (snap) => {
      const data = snap.data() || {};
      setHasGroceryItemsField(Object.prototype.hasOwnProperty.call(data, 'groceryItems'));
      const nextItems = Array.isArray(data.groceryItems) ? data.groceryItems : [];
      setItems(nextItems);
      setPendingItems(null);
    });

    return unsub;
  }, [household?.id]);

  useEffect(() => {
    const legacyGroceryList = lists.find((list) => list.name === LEGACY_GROCERY_LIST_NAME);
    if (!household?.id || hasGroceryItemsField || !legacyGroceryList || legacyGroceryList.items.length === 0) {
      return;
    }

    const migratedItems = legacyGroceryList.items.map((item) => ({
      id: item.id || createItemId(),
      text: item.text,
      checked: !!item.checked,
      createdAt: item.createdAt || item.created_at || new Date().toISOString(),
      createdBy: item.createdBy || item.created_by || legacyGroceryList.ownerId || null,
    }));

    updateDoc(doc(db, 'households', household.id), { groceryItems: migratedItems }).catch((err) => {
      setError(err?.message || 'Impossible de migrer la liste de courses.');
    });
  }, [household?.id, hasGroceryItemsField, lists]);

  const visibleItems = pendingItems || items;
  const checkedCount = visibleItems.filter((item) => item.checked).length;
  const total = visibleItems.length;
  const uncheckedItems = useMemo(() => visibleItems.filter((item) => !item.checked), [visibleItems]);
  const checkedItems = useMemo(() => visibleItems.filter((item) => item.checked), [visibleItems]);

  async function saveItems(nextItems) {
    if (!household?.id) return;
    setSaving(true);
    setError('');
    setPendingItems(nextItems);
    try {
      await updateDoc(doc(db, 'households', household.id), { groceryItems: nextItems });
    } catch (err) {
      setPendingItems(null);
      setError(err?.message || 'Impossible de mettre a jour la liste de courses.');
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function handleAddItem() {
    const text = newItem.trim();
    if (!text || !household?.id) return;
    setAdding(true);
    try {
      const nextItems = [
        ...items,
        {
          id: createItemId(),
          text,
          checked: false,
          createdAt: new Date().toISOString(),
          createdBy: session?.user?.uid || null,
        },
      ];
      await saveItems(nextItems);
      setNewItem('');
    } finally {
      setAdding(false);
    }
  }

  function confirmAction(message, onConfirm) {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(message)) {
        Promise.resolve(onConfirm()).catch(() => {});
      }
      return;
    }

    Alert.alert('Confirmation', message, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', onPress: () => { Promise.resolve(onConfirm()).catch(() => {}); } },
    ]);
  }

  function handleRefresh() {
    if (!items.some((item) => item.checked)) return;
    confirmAction('Decocher tous les articles ?', () => {
      return saveItems(items.map((item) => ({ ...item, checked: false })));
    });
  }

  async function handleToggleItem(itemId, current) {
    const nextItems = items.map((item) =>
      item.id === itemId ? { ...item, checked: !current } : item
    );
    await saveItems(nextItems);
  }

  async function handleDeleteItem(itemId) {
    setError('');
    try {
      const nextItems = items.filter((item) => item.id !== itemId);
      await saveItems(nextItems);
    } catch (err) {
      setError(err?.message || "Impossible de supprimer l'article.");
      throw err;
    }
  }

  return (
    <SafeAreaView className="flex-1" style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        className="flex-1"
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={20}
      >
        <View className="mx-auto flex-1 w-full max-w-5xl md:px-4">
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Courses</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {total === 0 ? 'Liste vide' : `${checkedCount} sur ${total} article${total > 1 ? 's' : ''}`}
              </Text>
            </View>
            {checkedCount > 0 && (
              <TouchableOpacity
                style={[styles.refreshBtn, { backgroundColor: colors.primaryLight }]}
                onPress={handleRefresh}
                disabled={saving}
              >
                <Text style={[styles.refreshText, { color: colors.primary }]}>Tout décocher</Text>
              </TouchableOpacity>
            )}
          </View>

          {total > 0 && (
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(checkedCount / total) * 100}%`,
                    backgroundColor: checkedCount === total ? colors.success : colors.primary,
                  },
                ]}
              />
            </View>
          )}

          {checkedCount === total && total > 0 && (
            <View style={[styles.doneBadge, { backgroundColor: colors.success + '22' }]}>
              <Text style={[styles.doneText, { color: colors.success }]}>Toutes les courses sont faites !</Text>
            </View>
          )}

          <FlatList
            className="flex-1"
            data={[...uncheckedItems, ...checkedItems]}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <GroceryItem
                item={item}
                colors={colors}
                onToggle={() => handleToggleItem(item.id, item.checked)}
                onDelete={() => handleDeleteItem(item.id)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🛒</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Liste vide</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Ajoutez vos articles ci-dessous
                </Text>
              </View>
            }
          />

          {error ? (
            <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
          ) : null}

          <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
              placeholder="Ajouter un article..."
              placeholderTextColor={colors.textMuted}
              value={newItem}
              onChangeText={setNewItem}
              onSubmitEditing={handleAddItem}
              returnKeyType="done"
              maxLength={100}
            />
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: newItem.trim() ? colors.primary : colors.border }]}
              onPress={handleAddItem}
              disabled={!newItem.trim() || adding || saving}
            >
              {adding || saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.addBtnText}>+</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function GroceryItem({ item, colors, onToggle, onDelete }) {
  return (
    <View style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable
        style={styles.itemMain}
        onPress={onToggle}
      >
        <Text
          style={[
            styles.checkbox,
            item.checked
              ? { backgroundColor: colors.success, borderColor: colors.success }
              : { borderColor: colors.border },
          ]}
        >
          {item.checked ? '✓' : ''}
        </Text>
        <Text style={[
          styles.itemText,
          item.checked
            ? { color: colors.textMuted, textDecorationLine: 'line-through' }
            : { color: colors.text },
        ]}>
          {item.text}
        </Text>
      </Pressable>
      <TouchableOpacity
        onPress={onDelete}
        hitSlop={10}
        style={[styles.deleteBtn, { backgroundColor: colors.surfaceAlt }]}
      >
        <Text style={[styles.deleteText, { color: colors.textMuted }]}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 3 },
  refreshBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  refreshText: { fontSize: 13, fontWeight: '700' },
  progressTrack: { height: 5, marginHorizontal: 20, borderRadius: 5, overflow: 'hidden', marginBottom: 12 },
  progressFill: { height: 5, borderRadius: 5 },
  doneBadge: { marginHorizontal: 20, marginBottom: 10, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  doneText: { fontWeight: '700', fontSize: 14 },
  listContent: { paddingBottom: 8, flexGrow: 1, paddingTop: 4 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  emptyText: { fontSize: 14, color: '#888' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderWidth: 1,
  },
  itemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  checkbox: {
    width: 26, height: 26, borderRadius: 8, borderWidth: 2,
    marginRight: 14, flexShrink: 0,
    textAlign: 'center', lineHeight: 22,
    color: '#fff', fontSize: 13, fontWeight: '700',
  },
  itemText: { flex: 1, fontSize: 16, lineHeight: 22 },
  deleteBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  deleteText: { fontSize: 18, lineHeight: 20 },
  error: {
    fontSize: 13,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10, borderTopWidth: 1,
  },
  input: { flex: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 16, borderWidth: 1 },
  addBtn: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 26, lineHeight: 30, fontWeight: '300' },
});
