import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { useTheme } from '../context/ThemeContext';

const WEEK_DAYS = [
  { key: 'monday', label: 'Lundi' },
  { key: 'tuesday', label: 'Mardi' },
  { key: 'wednesday', label: 'Mercredi' },
  { key: 'thursday', label: 'Jeudi' },
  { key: 'friday', label: 'Vendredi' },
  { key: 'saturday', label: 'Samedi' },
  { key: 'sunday', label: 'Dimanche' },
];

function createMealId(dayKey) {
  return `${dayKey}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeMeals(rawMeals) {
  const sourceMeals = Array.isArray(rawMeals) ? rawMeals : [];
  const byDay = new Map();
  const fallbackMeals = [];

  sourceMeals.forEach((meal) => {
    if (meal?.dayKey && WEEK_DAYS.some((day) => day.key === meal.dayKey)) {
      byDay.set(meal.dayKey, meal);
      return;
    }
    fallbackMeals.push(meal);
  });

  return WEEK_DAYS.map((day, index) => {
    const meal = byDay.get(day.key) || fallbackMeals[index] || null;
    if (!meal) {
      return {
        id: day.key,
        dayKey: day.key,
        dayLabel: day.label,
        title: '',
        description: '',
      };
    }

    return {
      id: meal.id || day.key,
      dayKey: day.key,
      dayLabel: day.label,
      title: meal.title || '',
      description: meal.description || '',
      createdAt: meal.createdAt || null,
      createdBy: meal.createdBy || null,
    };
  });
}

export default function MealsScreen() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const { household } = useHousehold();

  const [meals, setMeals] = useState(() => normalizeMeals([]));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [titleInput, setTitleInput] = useState('');
  const [descInput, setDescInput] = useState('');

  useEffect(() => {
    if (!household?.id) {
      setMeals(normalizeMeals([]));
      return;
    }

    const householdRef = doc(db, 'households', household.id);
    const unsub = onSnapshot(householdRef, (snap) => {
      const data = snap.data() || {};
      setMeals(normalizeMeals(data.weeklyMeals));
    });

    return unsub;
  }, [household?.id]);

  const completedMeals = useMemo(
    () => meals.filter((meal) => meal.title.trim().length > 0).length,
    [meals]
  );

  async function saveMeals(nextMeals) {
    if (!household?.id) return;
    setSaving(true);
    setError('');
    try {
      await updateDoc(doc(db, 'households', household.id), { weeklyMeals: nextMeals });
    } catch (err) {
      setError(err?.message || 'Impossible de sauvegarder le planning.');
    } finally {
      setSaving(false);
    }
  }

  function openEdit(meal) {
    setEditingMeal(meal);
    setTitleInput(meal.title || '');
    setDescInput(meal.description || '');
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditingMeal(null);
    setTitleInput('');
    setDescInput('');
  }

  async function handleSave() {
    if (!editingMeal) return;

    const title = titleInput.trim();
    const description = descInput.trim();
    const nextMeals = meals.map((meal) =>
      meal.dayKey === editingMeal.dayKey
        ? {
            ...meal,
            id: meal.id || createMealId(meal.dayKey),
            title,
            description,
            createdAt: meal.createdAt || new Date().toISOString(),
            createdBy: meal.createdBy || session?.user?.uid || null,
          }
        : meal
    );

    await saveMeals(nextMeals);
    closeModal();
  }

  async function handleClearDay(dayKey) {
    const nextMeals = meals.map((meal) =>
      meal.dayKey === dayKey
        ? {
            ...meal,
            title: '',
            description: '',
          }
        : meal
    );

    await saveMeals(nextMeals);
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
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.text }]}>Planning des repas</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {completedMeals === 0
                  ? 'Aucun jour complété'
                  : `${completedMeals} jour${completedMeals > 1 ? 's' : ''} sur 7 complété${completedMeals > 1 ? 's' : ''}`}
              </Text>
            </View>
          </View>

          <View style={[styles.progressCard, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
              Semaine en cours
            </Text>
            <Text style={[styles.progressValue, { color: colors.primary }]}>
              {completedMeals}/7
            </Text>
          </View>

          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

          <FlatList
            className="flex-1"
            data={meals}
            keyExtractor={(item) => item.dayKey}
            renderItem={({ item }) => (
              <MealDayCard
                meal={item}
                colors={colors}
                saving={saving}
                onEdit={() => openEdit(item)}
                onClear={() => handleClearDay(item.dayKey)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </KeyboardAvoidingView>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingMeal ? editingMeal.dayLabel : 'Repas'}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Renseignez le repas prévu pour ce jour
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
              placeholder="Plat ou repas"
              placeholderTextColor={colors.textMuted}
              value={titleInput}
              onChangeText={setTitleInput}
              autoFocus
              maxLength={80}
              returnKeyType="next"
            />
            <TextInput
              style={[styles.modalTextarea, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
              placeholder="Détails, accompagnement, notes..."
              placeholderTextColor={colors.textMuted}
              value={descInput}
              onChangeText={setDescInput}
              multiline
              maxLength={300}
              returnKeyType="done"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.surfaceAlt }]}
                onPress={closeModal}
              >
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>Enregistrer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function MealDayCard({ meal, colors, saving, onEdit, onClear }) {
  const hasMeal = meal.title.trim().length > 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.dayBadge}>
        <Text style={[styles.dayLabel, { color: colors.primary }]}>{meal.dayLabel}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: hasMeal ? colors.text : colors.textMuted }]}>
          {hasMeal ? meal.title : 'A compléter'}
        </Text>
        <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
          {hasMeal && meal.description ? meal.description : 'Appuyez sur modifier pour renseigner le repas du jour.'}
        </Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primaryLight }]}
          onPress={onEdit}
          disabled={saving}
        >
          <Text style={[styles.actionBtnText, { color: colors.primary }]}>{hasMeal ? '✎' : '+'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.surfaceAlt, opacity: hasMeal ? 1 : 0.55 }]}
          onPress={onClear}
          disabled={!hasMeal || saving}
        >
          <Text style={[styles.actionBtnText, { color: colors.textMuted }]}>×</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerText: { maxWidth: 420 },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 3 },
  progressCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: { fontSize: 13, fontWeight: '600' },
  progressValue: { fontSize: 24, fontWeight: '800' },
  error: { fontSize: 13, marginHorizontal: 20, marginBottom: 8 },
  listContent: { paddingBottom: 20, flexGrow: 1, paddingTop: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 12,
    marginHorizontal: 16,
    marginVertical: 5,
    borderWidth: 1,
  },
  dayBadge: {
    width: 92,
    marginRight: 12,
  },
  dayLabel: { fontSize: 15, fontWeight: '800' },
  cardContent: { flex: 1, marginRight: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  cardDesc: { fontSize: 14, marginTop: 3, lineHeight: 20 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontSize: 18, lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { width: '85%', maxWidth: 440, borderRadius: 20, padding: 24, borderWidth: 1 },
  modalTitle: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, marginBottom: 16 },
  modalInput: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, borderWidth: 1, marginBottom: 10 },
  modalTextarea: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, borderWidth: 1, marginBottom: 16, minHeight: 80, textAlignVertical: 'top' },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  modalBtnText: { fontSize: 15, fontWeight: '600' },
});
