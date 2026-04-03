import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import ListCard from '../components/ListCard';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useHousehold } from '../context/HouseholdContext';

const HIDDEN_LIST_NAMES = new Set(['🛒 Liste de courses']);

export default function HomeScreen({ navigation }) {
  const { lists, loading, addList, deleteList } = useApp();
  const { signOut, session } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const { members, household } = useHousehold();
  const [newListName, setNewListName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  function handleEditName() {
    setNameInput(session?.user?.displayName || '');
    setEditingName(true);
  }

  async function handleSaveName() {
    const name = nameInput.trim();
    if (!name) return;
    await updateProfile(auth.currentUser, { displayName: name });
    if (household?.id && session?.user?.uid) {
      await updateDoc(doc(db, 'households', household.id), {
        [`memberData.${session.user.uid}`]: {
          email: session.user.email,
          displayName: name,
        },
      });
    }
    setEditingName(false);
  }

  async function handleAddList() {
    const name = newListName.trim();
    if (!name) return;
    setAdding(true);
    setError('');
    try {
      await addList(name);
      setNewListName('');
    } catch (err) {
      setError(err?.message || 'Impossible de créer la liste.');
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteList(id) {
    setError('');
    try {
      await deleteList(id);
    } catch (err) {
      setError(err?.message || 'Impossible de supprimer la liste.');
    }
  }

  function confirmDeleteList(id) {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Supprimer la liste ? Cette action est irreversible.')) {
        handleDeleteList(id);
      }
      return;
    }

    Alert.alert('Supprimer la liste', 'Cette action est irreversible.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => handleDeleteList(id) },
    ]);
  }

  function handleSignOut() {
    Alert.alert('Deconnexion', 'Veux-tu te deconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Deconnecter', style: 'destructive', onPress: signOut },
    ]);
  }

  const visibleLists = lists.filter((list) => !HIDDEN_LIST_NAMES.has(list.name));
  const totalItems = visibleLists.reduce((acc, l) => acc + l.items.length, 0);
  const totalChecked = visibleLists.reduce((acc, l) => acc + l.items.filter((i) => i.checked).length, 0);

  return (
    <SafeAreaView className="flex-1" style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        className="flex-1"
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={20}
      >
        <View className="mx-auto flex-1 w-full max-w-6xl md:px-4">
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={[styles.title, { color: colors.text }]}>Liste de tâches</Text>
              <Text style={[styles.email, { color: colors.textSecondary }]} numberOfLines={1}>
                {session?.user?.email}
              </Text>
            </View>
            <View style={styles.headerBtns}>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={toggleTheme}
              >
                <Text style={styles.iconBtnText}>{isDark ? '☀️' : '🌙'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handleSignOut}
              >
                <Text style={styles.iconBtnText}>↩</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Household members */}
          {members.length > 0 && (
            <View style={[styles.membersCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.membersLabel, { color: colors.textMuted }]}>Foyer · {household?.code}</Text>
              <View style={styles.membersRow}>
                {members.map((m) => {
                  const isMe = m.uid === session?.user?.uid;
                  const name = m.displayName || m.email.split('@')[0];
                  return (
                    <TouchableOpacity
                      key={m.uid}
                      style={[styles.memberChip, { backgroundColor: colors.primaryLight }]}
                      onPress={isMe ? handleEditName : undefined}
                      activeOpacity={isMe ? 0.7 : 1}
                    >
                      <Text style={[styles.memberAvatar, { color: colors.primary }]}>
                        {name[0].toUpperCase()}
                      </Text>
                      <Text style={[styles.memberEmail, { color: colors.text }]} numberOfLines={1}>
                        {name}
                      </Text>
                      {isMe && (
                        <Text style={[styles.memberYou, { color: colors.primary }]}>✎</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Stats */}
          {visibleLists.length > 0 && (
            <View style={[styles.statsCard, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.primary }]}>{visibleLists.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>liste{visibleLists.length > 1 ? 's' : ''}</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.primary }]}>{totalItems}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>elements</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.success }]}>{totalChecked}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>faits</Text>
              </View>
            </View>
          )}

          {/* List */}
          <FlatList
            className="flex-1"
            data={visibleLists}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ListCard
                list={item}
                onPress={() => navigation.navigate('List', { listId: item.id })}
                onDelete={() => confirmDeleteList(item.id)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              !loading ? (
                <View style={styles.empty}>
                  <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryLight }]}>
                    <Text style={styles.emptyIcon}>📋</Text>
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>Créez votre première liste</Text>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    Utilisez le champ ci-dessous pour commencer
                  </Text>
                </View>
              ) : null
            }
          />

          {error ? (
            <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
          ) : null}

          {/* Input */}
          <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
              placeholder="Nouvelle liste..."
              placeholderTextColor={colors.textMuted}
              value={newListName}
              onChangeText={setNewListName}
              onSubmitEditing={handleAddList}
              returnKeyType="done"
              maxLength={60}
            />
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: newListName.trim() ? colors.primary : colors.border }]}
              onPress={handleAddList}
              disabled={!newListName.trim() || adding}
            >
              {adding
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.addBtnText}>+</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
        {/* Modal édition prénom */}
        <Modal visible={editingName} transparent animationType="fade" onRequestClose={() => setEditingName(false)}>
          <View className="items-center justify-center" style={styles.modalOverlay}>
            <View className="w-[85%] max-w-md md:w-full" style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Votre prénom</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
                placeholder="Prénom"
                placeholderTextColor={colors.textMuted}
                value={nameInput}
                onChangeText={setNameInput}
                autoCapitalize="words"
                autoCorrect={false}
                autoFocus
              />
              <View style={styles.modalBtns}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.surfaceAlt }]} onPress={() => setEditingName(false)}>
                  <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={handleSaveName}>
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: { flex: 1, marginRight: 12 },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  email: { fontSize: 13, marginTop: 3 },
  headerBtns: { flexDirection: 'row', gap: 8, marginTop: 4 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconBtnText: { fontSize: 18 },
  membersCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  membersLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  membersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memberChip: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, gap: 6 },
  memberAvatar: { fontSize: 14, fontWeight: '800' },
  memberEmail: { fontSize: 13, fontWeight: '600', maxWidth: 120 },
  memberYou: { fontSize: 12, fontWeight: '600' },
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  statItem: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, height: 30 },
  listContent: { paddingBottom: 8, flexGrow: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { width: '85%', borderRadius: 20, padding: 24, borderWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  modalInput: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, borderWidth: 1, marginBottom: 16 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  modalBtnText: { fontSize: 15, fontWeight: '600' },
});
