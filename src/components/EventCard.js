import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { IMPORTANCE } from '../context/AppContext';
import { useHousehold } from '../context/HouseholdContext';
import { useTheme } from '../context/ThemeContext';

export default function EventCard({ event, onEdit, onDelete }) {
  const { colors } = useTheme();
  const { session } = useAuth();
  const { members } = useHousehold();
  const isOwner = event.ownerId === session?.user?.uid;
  const canManage = isOwner || event.isShared;
  const imp = IMPORTANCE[event.importance] || IMPORTANCE.normal;
  const creator = members.find((member) => member.uid === event.ownerId);
  const creatorLabel = creator?.displayName || creator?.email?.split('@')[0] || 'Utilisateur inconnu';

  async function handleDelete() {
    try {
      await onDelete();
    } catch (error) {
      const message = error?.message || "Impossible de supprimer l'événement.";
      Alert.alert('Erreur', message);
    }
  }

  function confirmDelete() {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Supprimer "${event.title}" ?`)) {
        handleDelete();
      }
      return;
    }

    Alert.alert('Supprimer', `Supprimer "${event.title}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: handleDelete },
    ]);
  }

  const timeStr = event.time ? event.time.slice(0, 5) : null;
  const endTimeStr = event.endTime ? event.endTime.slice(0, 5) : null;
  const durationStr = timeStr && endTimeStr ? `${timeStr} – ${endTimeStr}` : timeStr;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.stripe, { backgroundColor: imp.color }]} />
      <View style={styles.body}>
        <View style={styles.top}>
          <View style={[styles.badge, { backgroundColor: imp.color + '22' }]}>
            <Text style={[styles.badgeText, { color: imp.color }]}>{imp.label}</Text>
          </View>
          {event.isShared && (
            <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.badgeText, { color: colors.primary }]}>Partagé</Text>
            </View>
          )}
        </View>

        <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>

        <Text style={[styles.creator, { color: colors.textMuted }]}>
          Ajouté par {isOwner ? 'vous' : creatorLabel}
        </Text>

        <View style={styles.meta}>
          {durationStr && (
            <Text style={[styles.metaItem, { color: colors.textSecondary }]}>🕐 {durationStr}</Text>
          )}
          {event.location ? (
            <Text style={[styles.metaItem, { color: colors.textSecondary }]} numberOfLines={1}>
              📍 {event.location}
            </Text>
          ) : null}
        </View>

        {event.notes ? (
          <Text style={[styles.notes, { color: colors.textSecondary }]} numberOfLines={2}>
            {event.notes}
          </Text>
        ) : null}

        {canManage && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.editAction, { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
              onPress={onEdit}
            >
              <Text style={[styles.editActionText, { color: colors.primary }]}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteAction, { borderColor: colors.danger, backgroundColor: colors.danger + '12' }]}
              onPress={confirmDelete}
            >
              <Text style={[styles.deleteActionText, { color: colors.danger }]}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 5,
    borderWidth: 1,
    overflow: 'hidden',
  },
  stripe: { width: 5 },
  body: { flex: 1, padding: 14 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  creator: { fontSize: 12, marginBottom: 8 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  metaItem: { fontSize: 13 },
  notes: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  editAction: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  editActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  deleteAction: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  deleteActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
