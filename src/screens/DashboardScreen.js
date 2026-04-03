import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { useTheme } from '../context/ThemeContext';

const SECTIONS = [
  {
    name: 'Listes',
    emoji: '📋',
    description: 'Gérez vos listes de tâches partagées',
  },
  {
    name: 'Courses',
    emoji: '🛒',
    description: 'Organisez vos achats ensemble',
  },
  {
    name: 'Repas',
    emoji: '🍽️',
    description: 'Planifiez les repas de la semaine',
  },
  {
    name: 'Calendrier',
    emoji: '📅',
    description: 'Suivez vos événements communs',
  },
];

export default function DashboardScreen({ navigation }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const { session, signOut } = useAuth();
  const { members, household } = useHousehold();

  const memberNames = members.map((m) => m.displayName || m.email.split('@')[0]);
  const householdName =
    memberNames.length === 0
      ? 'votre foyer'
      : memberNames.length === 1
      ? memberNames[0]
      : memberNames.slice(0, -1).join(', ') + ' et ' + memberNames[memberNames.length - 1];

  return (
    <SafeAreaView
      className="flex-1"
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View className="mx-auto w-full max-w-2xl md:px-4">
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={[styles.welcome, { color: colors.textSecondary }]}>
                Bienvenue dans le foyer de
              </Text>
              <Text style={[styles.householdName, { color: colors.text }]} numberOfLines={2}>
                {householdName}
              </Text>
              {household?.code ? (
                <Text style={[styles.code, { color: colors.textMuted }]}>
                  Code : {household.code}
                </Text>
              ) : null}
            </View>
            <View style={styles.headerBtns}>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={toggleTheme}
              >
                <Text style={styles.iconBtnText}>{isDark ? '☀️' : '🌙'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Members */}
          {members.length > 0 && (
            <View style={[styles.membersCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Membres du foyer</Text>
              <View style={styles.membersRow}>
                {members.map((m) => {
                  const name = m.displayName || m.email.split('@')[0];
                  const isMe = m.uid === session?.user?.uid;
                  return (
                    <View key={m.uid} style={[styles.memberChip, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.memberAvatar, { color: colors.primary }]}>
                        {name[0].toUpperCase()}
                      </Text>
                      <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                        {name}{isMe ? ' (moi)' : ''}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Navigation cards */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted, marginHorizontal: 4, marginBottom: 10, marginTop: 4 }]}>
            Accès rapide
          </Text>
          <View style={styles.grid}>
            {SECTIONS.map((section) => (
              <TouchableOpacity
                key={section.name}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => navigation.navigate(section.name)}
                activeOpacity={0.7}
              >
                <Text style={styles.cardEmoji}>{section.emoji}</Text>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{section.name}</Text>
                <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{section.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerLeft: { flex: 1, marginRight: 12 },
  welcome: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  householdName: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, lineHeight: 34 },
  code: { fontSize: 12, marginTop: 4 },
  headerBtns: { flexDirection: 'row', gap: 8, marginTop: 4 },
  iconBtn: {
    width: 42, height: 42, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  iconBtnText: { fontSize: 18 },
  membersCard: {
    borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 20,
  },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  membersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memberChip: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, gap: 6 },
  memberAvatar: { fontSize: 14, fontWeight: '800' },
  memberName: { fontSize: 13, fontWeight: '600', maxWidth: 120 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  cardEmoji: { fontSize: 36, marginBottom: 10 },
  cardTitle: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  cardDesc: { fontSize: 13, lineHeight: 18 },
});
