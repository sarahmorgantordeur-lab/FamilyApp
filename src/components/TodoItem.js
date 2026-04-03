import { useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function TodoItem({ item, onToggle, onDelete }) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start();
  }
  function handlePressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();
  }

  function handleDeletePress(event) {
    event?.stopPropagation?.();
    onDelete();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <View
        style={[
          styles.row,
          {
            backgroundColor: colors.surface,
            borderColor: item.checked ? colors.border : colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.main}
          onPress={onToggle}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          <View
            style={[
              styles.checkbox,
              item.checked
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { borderColor: colors.border, backgroundColor: 'transparent' },
            ]}
          >
            {item.checked && <Text style={styles.checkmark}>✓</Text>}
          </View>

          <Text
            style={[
              styles.text,
              item.checked
                ? { color: colors.textMuted, textDecorationLine: 'line-through' }
                : { color: colors.text },
            ]}
            numberOfLines={3}
          >
            {item.text}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.deleteBtn, { backgroundColor: colors.surfaceAlt }]}
          onPress={handleDeletePress}
          hitSlop={10}
        >
          <Text style={[styles.deleteText, { color: colors.textMuted }]}>×</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
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
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  text: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    flexShrink: 0,
  },
  deleteText: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '400',
  },
});
