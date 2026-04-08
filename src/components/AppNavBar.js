import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { useTheme } from '../context/ThemeContext';

const TABS = [
  { name: 'Accueil',    emoji: '🏠' },
  { name: 'Listes',     emoji: '📋' },
  { name: 'Courses',    emoji: '🛒' },
  { name: 'Repas',      emoji: '🍽️' },
  { name: 'Calendrier', emoji: '📅' },
  { name: 'Finances',   emoji: '💰' },
];

export default function AppNavBar({ state, navigation }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const { household } = useHousehold();
  const { width } = useWindowDimensions();

  const isMobile = width < 768;
  const currentRoute = state.routes[state.index]?.name;

  // Mobile web : barre du bas avec icônes seulement
  if (isMobile) {
    return (
      <View style={[styles.mobileBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {TABS.map(({ name, emoji }) => {
          const active = currentRoute === name;
          return (
            <TouchableOpacity
              key={name}
              style={styles.mobileTab}
              onPress={() => navigation.navigate('Tabs', { screen: name })}
              activeOpacity={0.7}
            >
              <Text style={[styles.mobileEmoji, { opacity: active ? 1 : 0.45 }]}>{emoji}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // Desktop web : barre du haut complète
  return (
    <View style={[styles.bar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {/* Gauche : nom du foyer */}
      <View style={styles.left}>
        <Text style={[styles.appName, { color: colors.primary }]}>🏡</Text>
        {household?.code ? (
          <Text style={[styles.householdCode, { color: colors.textMuted }]}>
            {household.code}
          </Text>
        ) : null}
      </View>

      {/* Centre : onglets */}
      <View style={styles.tabs}>
        {TABS.map(({ name, emoji }) => {
          const active = currentRoute === name;
          return (
            <TouchableOpacity
              key={name}
              style={[
                styles.tab,
                active
                  ? { backgroundColor: colors.primaryLight, borderColor: colors.primary + '44' }
                  : { backgroundColor: 'transparent', borderColor: 'transparent' },
              ]}
              onPress={() => navigation.navigate('Tabs', { screen: name })}
              activeOpacity={0.7}
            >
              <Text style={styles.tabEmoji}>{emoji}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Droite : contrôles */}
      <View style={styles.right}>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          onPress={toggleTheme}
        >
          <Text style={styles.iconText}>{isDark ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          onPress={signOut}
        >
          <Text style={styles.iconText}>↩</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Desktop
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    height: 60,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 60,
  },
  appName: { fontSize: 22 },
  householdCode: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    justifyContent: 'center',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  tabEmoji: { fontSize: 20 },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 80,
    justifyContent: 'flex-end',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 16 },

  // Mobile
  mobileBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    height: 60,
  },
  mobileTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileEmoji: { fontSize: 24 },
});
