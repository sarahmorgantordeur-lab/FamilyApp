import { useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, doc, getDocs, orderBy, query, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import TodoItem from '../components/TodoItem';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

export default function ListScreen({ route, navigation }) {
  const { listId } = route.params;
  const { lists, addItem, toggleItem, deleteItem, uncheckAll, renameList, toggleShared, setItemReminder } = useApp();
  const { session } = useAuth();
  const { colors } = useTheme();
  const [newItemText, setNewItemText] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [reminderModal, setReminderModal] = useState(null); // { itemId, date, time }

  function defaultReminderValues() {
    const d = new Date(Date.now() + 60 * 60 * 1000); // +1h
    const date = d.toISOString().slice(0, 10);
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(Math.floor(d.getMinutes() / 15) * 15).padStart(2, '0')}`;
    return { date, time };
  }

  function openReminderModal(itemId) {
    const item = list?.items?.find((i) => i.id === itemId);
    if (item?.reminderAt) {
      const [date, time] = item.reminderAt.split('T');
      setReminderModal({ itemId, date, time: time?.slice(0, 5) || '' });
    } else {
      setReminderModal({ itemId, ...defaultReminderValues() });
    }
  }

  async function handleConfirmReminder() {
    if (!reminderModal) return;
    const { itemId, date, time } = reminderModal;
    const reminderAt = date && time ? `${date}T${time}` : null;
    try {
      await setItemReminder(itemId, listId, reminderAt);
    } catch (err) {
      setError(err?.message || 'Impossible de définir le rappel.');
    }
    setReminderModal(null);
  }

  async function handleRemoveReminder() {
    if (!reminderModal) return;
    try {
      await setItemReminder(reminderModal.itemId, listId, null);
    } catch (err) {
      setError(err?.message || 'Impossible de supprimer le rappel.');
    }
    setReminderModal(null);
  }

  const list = lists.find((l) => l.id === listId);
  const isOwner = list?.ownerId === session?.user?.uid;

  useEffect(() => {
    if (!list?.isShared || !Array.isArray(list.items) || list.items.length === 0) return;

    const itemsQuery = query(
      collection(db, 'lists', list.id, 'items'),
      orderBy('createdAt', 'asc')
    );

    getDocs(itemsQuery).then((snap) => {
      if (!snap.empty) return;

      Promise.all(
        list.items.map((item) =>
          setDoc(doc(db, 'lists', list.id, 'items', item.id), {
            text: item.text || '',
            checked: !!item.checked,
            dueDate: item.dueDate ?? item.due_date ?? null,
            createdAt: item.createdAt ?? item.created_at ?? new Date().toISOString(),
            listId: list.id,
            ownerId: item.ownerId || item.owner_id || list.ownerId || session?.user?.uid || null,
            householdId: item.householdId || item.household_id || list.householdId || null,
            isShared: true,
          })
        )
      ).catch((err) => {
        setError(err?.message || "Impossible de migrer les éléments partagés.");
      });
    }).catch((err) => {
      setError(err?.message || "Impossible de lire les éléments de la liste.");
    });
  }, [list, session?.user?.uid]);

  useLayoutEffect(() => {
    if (!list) return;
    navigation.setOptions({
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.text,
      headerShadowVisible: false,
      title: '',
      headerRight: () => (
        <TouchableOpacity
          onPress={handleRefresh}
          style={[styles.refreshBtn, { backgroundColor: colors.primaryLight }]}
        >
          <Text style={[styles.refreshText, { color: colors.primary }]}>Tout decocher</Text>
        </TouchableOpacity>
      ),
    });
  }, [list, colors]);

  if (!list) {
    return (
      <SafeAreaView className="flex-1" style={[styles.safe, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  async function handleAddItem() {
    const text = newItemText.trim();
    if (!text) return;
    setAdding(true);
    setError('');
    try {
      await addItem(listId, text);
      setNewItemText('');
    } catch (err) {
      setError(err?.message || "Impossible d'ajouter l'article.");
    } finally {
      setAdding(false);
    }
  }

  function handleRefresh() {
    const hasChecked = list.items.some((i) => i.checked);
    if (!hasChecked) return;
    Alert.alert('Tout decocher', 'Decocher tous les elements ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Decocher tout', onPress: () => uncheckAll(listId, list.items) },
    ]);
  }

  async function handleRenameSubmit() {
    const name = nameValue.trim();
    if (name && name !== list.name) await renameList(listId, name);
    setEditingName(false);
  }

  async function handleToggleShared() {
    await toggleShared(listId, list.isShared);
  }

  async function handleDeleteItem(itemId) {
    setError('');
    try {
      await deleteItem(itemId, listId);
    } catch (err) {
      setError(err?.message || "Impossible de supprimer l'article.");
      throw err;
    }
  }

  const checkedCount = list.items.filter((i) => i.checked).length;
  const totalCount = list.items.length;
  const progress = totalCount > 0 ? checkedCount / totalCount : 0;
  const allDone = totalCount > 0 && checkedCount === totalCount;

  return (
    <SafeAreaView className="flex-1" style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <View className="mx-auto flex-1 w-full max-w-5xl md:px-4">
          {Platform.OS === 'web' && (
            <View style={[styles.webNav, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.webNavBack, { backgroundColor: colors.primaryLight }]}
                onPress={() => navigation.navigate('Tabs', { screen: 'Listes' })}
              >
                <Text style={[styles.webNavBackText, { color: colors.primary }]}>← Retour</Text>
              </TouchableOpacity>
              <View style={styles.webNavLinks}>
                <TouchableOpacity
                  style={[styles.webNavLink, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                  onPress={() => navigation.navigate('Tabs', { screen: 'Listes' })}
                >
                  <Text style={[styles.webNavLinkText, { color: colors.text }]}>Listes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.webNavLink, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                  onPress={() => navigation.navigate('Tabs', { screen: 'Courses' })}
                >
                  <Text style={[styles.webNavLinkText, { color: colors.text }]}>Courses</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.webNavLink, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                  onPress={() => navigation.navigate('Tabs', { screen: 'Calendrier' })}
                >
                  <Text style={[styles.webNavLinkText, { color: colors.text }]}>Calendrier</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Title + sharing */}
          <View style={styles.titleRow}>
            <View style={styles.titleLeft}>
              {editingName ? (
                <TextInput
                  style={[styles.titleInput, { color: colors.text, borderBottomColor: colors.primary }]}
                  value={nameValue}
                  onChangeText={setNameValue}
                  onBlur={handleRenameSubmit}
                  onSubmitEditing={handleRenameSubmit}
                  autoFocus
                  maxLength={60}
                />
              ) : (
                <TouchableOpacity
                  onPress={() => { if (isOwner) { setNameValue(list.name); setEditingName(true); } }}
                >
                  <Text style={[styles.titleText, { color: colors.text }]}>{list.name}</Text>
                  {isOwner && (
                    <Text style={[styles.editHint, { color: colors.textMuted }]}>Appuyer pour renommer</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {isOwner && (
              <TouchableOpacity
                style={[
                  styles.shareBtn,
                  {
                    backgroundColor: list.isShared ? colors.primaryLight : colors.surfaceAlt,
                    borderColor: list.isShared ? colors.primary : colors.border,
                  },
                ]}
                onPress={handleToggleShared}
              >
                <Text style={[styles.shareIcon]}>🔗</Text>
                <Text style={[styles.shareText, { color: list.isShared ? colors.primary : colors.textSecondary }]}>
                  {list.isShared ? 'Partagee' : 'Partager'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Progress */}
          <View style={styles.progressSection}>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress * 100}%`,
                    backgroundColor: allDone ? colors.success : colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
              {totalCount === 0 ? 'Vide' : `${checkedCount} / ${totalCount}`}
            </Text>
          </View>

          {allDone && (
            <View style={[styles.doneBadge, { backgroundColor: colors.success + '22' }]}>
              <Text style={[styles.doneText, { color: colors.success }]}>Tout est fait !</Text>
            </View>
          )}

          {/* Items */}
          <FlatList
            className="flex-1"
            data={list.items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TodoItem
                item={item}
                onToggle={() => toggleItem(item.id, listId, item.checked)}
                onDelete={() => handleDeleteItem(item.id)}
                onSetReminder={openReminderModal}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryLight }]}>
                  <Text style={styles.emptyIcon}>✏️</Text>
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Liste vide</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Ajoutez votre premier element ci-dessous
                </Text>
              </View>
            }
          />

          {error ? (
            <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
          ) : null}

          {/* Input */}
          <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
              placeholder="Ajouter un element..."
              placeholderTextColor={colors.textMuted}
              value={newItemText}
              onChangeText={setNewItemText}
              onSubmitEditing={handleAddItem}
              returnKeyType="done"
              maxLength={200}
            />
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: newItemText.trim() ? colors.primary : colors.border }]}
              onPress={handleAddItem}
              disabled={!newItemText.trim() || adding}
            >
              {adding
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.addBtnText}>+</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ─── Modal rappel ─────────────────────────────────────────────────── */}
      <Modal visible={!!reminderModal} transparent animationType="slide" onRequestClose={() => setReminderModal(null)}>
        <KeyboardAvoidingView
          style={styles.reminderOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setReminderModal(null)} />
          <View style={[styles.reminderSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.reminderHandle} />
            <Text style={[styles.reminderTitle, { color: colors.text }]}>Définir un rappel</Text>

            <Text style={[styles.reminderLabel, { color: colors.textSecondary }]}>Date (AAAA-MM-JJ)</Text>
            <TextInput
              style={[styles.reminderInput, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
              value={reminderModal?.date || ''}
              onChangeText={(v) => setReminderModal((m) => ({ ...m, date: v }))}
              placeholder="ex. 2026-04-08"
              placeholderTextColor={colors.textMuted}
              maxLength={10}
              keyboardType="numeric"
            />

            <Text style={[styles.reminderLabel, { color: colors.textSecondary }]}>Heure</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeRow}>
              {Array.from({ length: 24 * 4 }, (_, i) => {
                const h = String(Math.floor(i / 4)).padStart(2, '0');
                const m = String((i % 4) * 15).padStart(2, '0');
                const t = `${h}:${m}`;
                const active = reminderModal?.time === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.timeChip, { backgroundColor: active ? colors.primary : colors.surfaceAlt, borderColor: active ? colors.primary : colors.border }]}
                    onPress={() => setReminderModal((m2) => ({ ...m2, time: t }))}
                  >
                    <Text style={[styles.timeChipText, { color: active ? '#fff' : colors.textSecondary }]}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.reminderActions}>
              <TouchableOpacity
                style={[styles.reminderBtn, { backgroundColor: colors.primary }]}
                onPress={handleConfirmReminder}
              >
                <Text style={styles.reminderBtnText}>Enregistrer</Text>
              </TouchableOpacity>
              {reminderModal && list?.items?.find((i) => i.id === reminderModal.itemId)?.reminderAt && (
                <TouchableOpacity
                  style={[styles.reminderBtn, { backgroundColor: colors.danger + '22', borderColor: colors.danger + '55', borderWidth: 1 }]}
                  onPress={handleRemoveReminder}
                >
                  <Text style={[styles.reminderBtnText, { color: colors.danger }]}>Supprimer le rappel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  webNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  webNavBack: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  webNavBackText: { fontSize: 14, fontWeight: '700' },
  webNavLinks: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  webNavLink: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  webNavLinkText: { fontSize: 14, fontWeight: '700' },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 12,
  },
  titleLeft: { flex: 1 },
  titleText: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  editHint: { fontSize: 11, marginTop: 3 },
  titleInput: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    borderBottomWidth: 2,
    paddingBottom: 4,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  shareIcon: { fontSize: 13 },
  shareText: { fontSize: 13, fontWeight: '600' },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 6 },
  progressLabel: { fontSize: 13, minWidth: 48, textAlign: 'right' },
  doneBadge: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  doneText: { fontWeight: '700', fontSize: 14 },
  listContent: { paddingBottom: 8, flexGrow: 1 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIcon: { fontSize: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  error: { fontSize: 13, marginHorizontal: 20, marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    borderWidth: 1,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 26, lineHeight: 30, fontWeight: '300' },
  reminderOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  reminderSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36, borderWidth: 1, borderBottomWidth: 0 },
  reminderHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  reminderTitle: { fontSize: 18, fontWeight: '800', marginBottom: 20 },
  reminderLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  reminderInput: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, borderWidth: 1, marginBottom: 16 },
  timeRow: { marginBottom: 20 },
  timeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, marginRight: 6 },
  timeChipText: { fontSize: 13, fontWeight: '600' },
  reminderActions: { gap: 10 },
  reminderBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  reminderBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginRight: 4,
  },
  refreshText: { fontSize: 13, fontWeight: '600' },
});
