import { useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useHousehold } from '../context/HouseholdContext';

export default function ListCard({ list, onPress, onDelete }) {
  const { colors } = useTheme();
  const { session } = useAuth();
  const { members } = useHousehold();
  const scale = useRef(new Animated.Value(1)).current;

  const total = list.items.length;
  const checked = list.items.filter((i) => i.checked).length;
  const progress = total > 0 ? checked / total : 0;
  const allDone = total > 0 && checked === total;
  const isOwner = list.ownerId === session?.user?.uid;

  const creator = members.find((m) => m.uid === list.ownerId);
  const creatorLabel = creator
    ? (creator.uid === session?.user?.uid ? 'moi' : (creator.displayName || creator.email.split('@')[0]))
    : null;

  function handlePressIn() {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  }
  function handlePressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <View
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.top}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
            <Text style={styles.icon}>{allDone ? '✓' : '≡'}</Text>
          </View>

          <TouchableOpacity
            style={styles.nameWrap}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
          >
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {list.name}
              </Text>
              {list.isShared && (
                <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>Partagee</Text>
                </View>
              )}
            </View>
            <Text style={[styles.count, { color: colors.textSecondary }]}>
              {total === 0 ? 'Vide' : `${checked} sur ${total} element${total > 1 ? 's' : ''}`}
              {creatorLabel ? `  ·  par ${creatorLabel}` : ''}
            </Text>
          </TouchableOpacity>

          {isOwner && (
            <TouchableOpacity
              style={[styles.deleteBtn, { backgroundColor: colors.surfaceAlt }]}
              onPress={onDelete}
              hitSlop={10}
            >
              <Text style={[styles.deleteText, { color: colors.textMuted }]}>×</Text>
            </TouchableOpacity>
          )}
        </View>

        {total > 0 && (
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
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  icon: { fontSize: 18, color: '#7B7BF8' },
  nameWrap: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  count: { fontSize: 13, marginTop: 3 },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  deleteText: { fontSize: 20, lineHeight: 22 },
  progressTrack: {
    height: 5,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: 5,
    borderRadius: 5,
  },
});
