import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IMPORTANCE } from '../context/AppContext';
import { useHousehold } from '../context/HouseholdContext';
import { useTheme } from '../context/ThemeContext';

const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, index) => {
  const hours = String(Math.floor(index / 4)).padStart(2, '0');
  const minutes = String((index % 4) * 15).padStart(2, '0');
  return `${hours}:${minutes}`;
});

export default function EventForm({ visible, onClose, onSave, initialDate, event }) {
  const { colors } = useTheme();
  const { household } = useHousehold();
  const isEdit = !!event;
  const isHouseholdEvent = !!household?.id;

  const [title, setTitle]         = useState('');
  const [location, setLocation]   = useState('');
  const [date, setDate]           = useState(initialDate || '');
  const [time, setTime]           = useState('');
  const [endTime, setEndTime]     = useState('');
  const [notes, setNotes]         = useState('');
  const [importance, setImportance] = useState('normal');
  const [isShared, setIsShared]   = useState(false);
  const [error, setError]         = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(event?.title || '');
      setLocation(event?.location || '');
      setDate(event?.date || initialDate || '');
      setTime(event?.time?.slice(0, 5) || '');
      setEndTime(event?.endTime?.slice(0, 5) || '');
      setNotes(event?.notes || '');
      setImportance(event?.importance || 'normal');
      setIsShared(isHouseholdEvent ? true : (event?.isShared || false));
      setError('');
    }
  }, [visible, event, initialDate, isHouseholdEvent]);

  async function handleSave() {
    if (!title.trim()) { setError('Le titre est requis.'); return; }
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) { setError('Date invalide (format AAAA-MM-JJ).'); return; }
    if (time && !time.match(/^\d{2}:\d{2}$/)) { setError('Heure invalide (format HH:MM).'); return; }
    if (endTime && !endTime.match(/^\d{2}:\d{2}$/)) { setError('Heure de fin invalide (format HH:MM).'); return; }
    const saveError = await onSave({
      title: title.trim(),
      location: location.trim() || null,
      date,
      time: time || null,
      endTime: endTime || null,
      notes: notes.trim() || null,
      importance,
      isShared: isHouseholdEvent ? true : isShared,
    });
    if (saveError) {
      setError(saveError);
      return;
    }
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.cancel, { color: colors.textSecondary }]}>Annuler</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {isEdit ? 'Modifier' : 'Nouvel événement'}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={[styles.save, { color: colors.primary }]}>Sauver</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Title */}
            <Field label="Titre" colors={colors}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
                placeholder="Nom de l'événement"
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
            </Field>

            {/* Date */}
            <Field label="Date" colors={colors}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
                placeholder="2026-04-15"
                placeholderTextColor={colors.textMuted}
                value={date}
                onChangeText={setDate}
                keyboardType="numeric"
                maxLength={10}
              />
            </Field>

            {/* Heure début + fin */}
            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Field label="Heure de début" colors={colors}>
                  <TouchableOpacity
                    style={[styles.input, styles.selectInput, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Text style={{ color: time ? colors.text : colors.textMuted, fontSize: 16 }}>
                      {time || 'Choisir'}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 14 }}>▾</Text>
                  </TouchableOpacity>
                  {time ? (
                    <TouchableOpacity style={styles.clearTimeBtn} onPress={() => setTime('')}>
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Effacer</Text>
                    </TouchableOpacity>
                  ) : null}
                </Field>
              </View>
              <View style={styles.rowItem}>
                <Field label="Heure de fin" colors={colors}>
                  <TouchableOpacity
                    style={[styles.input, styles.selectInput, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                    onPress={() => setShowEndTimePicker(true)}
                  >
                    <Text style={{ color: endTime ? colors.text : colors.textMuted, fontSize: 16 }}>
                      {endTime || 'Choisir'}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 14 }}>▾</Text>
                  </TouchableOpacity>
                  {endTime ? (
                    <TouchableOpacity style={styles.clearTimeBtn} onPress={() => setEndTime('')}>
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Effacer</Text>
                    </TouchableOpacity>
                  ) : null}
                </Field>
              </View>
            </View>

            {/* Location */}
            <Field label="Lieu" colors={colors}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
                placeholder="Adresse ou lieu"
                placeholderTextColor={colors.textMuted}
                value={location}
                onChangeText={setLocation}
                maxLength={200}
              />
            </Field>

            {/* Notes */}
            <Field label="Notes" colors={colors}>
              <TextInput
                style={[styles.input, styles.textarea, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
                placeholder="Informations supplémentaires..."
                placeholderTextColor={colors.textMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                maxLength={500}
                textAlignVertical="top"
              />
            </Field>

            {/* Importance */}
            <Field label="Importance" colors={colors}>
              <View style={styles.importanceRow}>
                {Object.entries(IMPORTANCE).map(([key, val]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.impBtn,
                      {
                        backgroundColor: importance === key ? val.color : colors.surfaceAlt,
                        borderColor: val.color,
                      },
                    ]}
                    onPress={() => setImportance(key)}
                  >
                    <Text style={[styles.impText, { color: importance === key ? '#fff' : val.color }]}>
                      {val.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>

            {/* Shared toggle */}
            <TouchableOpacity
              style={[styles.sharedRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={isHouseholdEvent ? undefined : () => setIsShared((v) => !v)}
              activeOpacity={isHouseholdEvent ? 1 : 0.7}
            >
              <View>
                <Text style={[styles.sharedTitle, { color: colors.text }]}>
                  {isHouseholdEvent ? 'Événement du foyer' : 'Événement partagé'}
                </Text>
                <Text style={[styles.sharedSub, { color: colors.textSecondary }]}>
                  {isHouseholdEvent ? 'Visible automatiquement par tous les membres du foyer' : 'Visible par toute la famille'}
                </Text>
              </View>
              <View style={[styles.toggle, { backgroundColor: isShared ? colors.primary : colors.border }]}>
                <View style={[styles.toggleKnob, { left: isShared ? 22 : 2 }]} />
              </View>
            </TouchableOpacity>

            {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Picker heure début */}
        <Modal
          visible={showTimePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTimePicker(false)}
        >
          <View style={styles.pickerOverlay}>
            <View style={[styles.pickerModal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.pickerTitle, { color: colors.text }]}>Heure de début</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={[styles.pickerClose, { color: colors.primary }]}>Fermer</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                {TIME_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.timeOption, { backgroundColor: time === option ? colors.primaryLight : colors.surfaceAlt, borderColor: time === option ? colors.primary : colors.border }]}
                    onPress={() => { setTime(option); setShowTimePicker(false); }}
                  >
                    <Text style={[styles.timeOptionText, { color: time === option ? colors.primary : colors.text }]}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Picker heure fin */}
        <Modal
          visible={showEndTimePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowEndTimePicker(false)}
        >
          <View style={styles.pickerOverlay}>
            <View style={[styles.pickerModal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.pickerTitle, { color: colors.text }]}>Heure de fin</Text>
                <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                  <Text style={[styles.pickerClose, { color: colors.primary }]}>Fermer</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                {TIME_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.timeOption, { backgroundColor: endTime === option ? colors.primaryLight : colors.surfaceAlt, borderColor: endTime === option ? colors.primary : colors.border }]}
                    onPress={() => { setEndTime(option); setShowEndTimePicker(false); }}
                  >
                    <Text style={[styles.timeOptionText, { color: endTime === option ? colors.primary : colors.text }]}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

function Field({ label, colors, children }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      {children}
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
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  cancel: { fontSize: 16 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  save: { fontSize: 16, fontWeight: '700' },
  scroll: { flex: 1, paddingHorizontal: 20 },
  field: { marginTop: 20 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  textarea: { minHeight: 80, paddingTop: 12 },
  row: { flexDirection: 'row', gap: 12 },
  rowItem: { flex: 1 },
  selectInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clearTimeBtn: { marginTop: 8, alignSelf: 'flex-start' },
  importanceRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  impBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  impText: { fontSize: 13, fontWeight: '700' },
  sharedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  sharedTitle: { fontSize: 15, fontWeight: '600' },
  sharedSub: { fontSize: 13, marginTop: 2 },
  toggle: { width: 46, height: 26, borderRadius: 13, justifyContent: 'center' },
  toggleKnob: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  pickerModal: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '75%',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  pickerTitle: { fontSize: 16, fontWeight: '700' },
  pickerClose: { fontSize: 15, fontWeight: '700' },
  pickerScroll: { padding: 12 },
  timeOption: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  timeOptionText: { fontSize: 15, fontWeight: '600' },
  error: { marginTop: 16, textAlign: 'center', fontSize: 13 },
});
