import { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import EventCard from '../components/EventCard';
import EventForm from '../components/EventForm';
import { IMPORTANCE, useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

LocaleConfig.locales['fr'] = {
  monthNames: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
  monthNamesShort: ['Janv.','Févr.','Mars','Avr.','Mai','Juin','Juil.','Août','Sept.','Oct.','Nov.','Déc.'],
  dayNames: ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'],
  dayNamesShort: ['Dim.','Lun.','Mar.','Mer.','Jeu.','Ven.','Sam.'],
  today: "Aujourd'hui",
};
LocaleConfig.defaultLocale = 'fr';

export default function CalendarScreen() {
  const { events, lists, addEvent, updateEvent, deleteEvent } = useApp();
  const { colors, isDark } = useTheme();
  const today = new Date().toISOString().slice(0, 10);
  const [selected, setSelected] = useState(today);
  const [visibleMonth, setVisibleMonth] = useState(today);
  const [showForm, setShowForm]   = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  // Collect todo deadlines from all lists
  const deadlines = useMemo(() => {
    const result = [];
    lists.forEach((list) => {
      list.items.forEach((item) => {
        if (item.due_date && !item.checked) {
          result.push({
            id: `deadline-${item.id}`,
            date: item.due_date,
            title: item.text,
            listName: list.name,
            isDeadline: true,
          });
        }
      });
    });
    return result;
  }, [lists]);

  // Build marked dates for the calendar
  const markedDates = useMemo(() => {
    const marks = {};

    events.forEach((ev) => {
      const color = IMPORTANCE[ev.importance]?.color || IMPORTANCE.normal.color;
      if (!marks[ev.date]) marks[ev.date] = { dots: [] };
      marks[ev.date].dots.push({ color, key: ev.id });
    });

    deadlines.forEach((d) => {
      if (!marks[d.date]) marks[d.date] = { dots: [] };
      marks[d.date].dots.push({ color: colors.textMuted, key: d.id });
    });

    if (marks[selected]) {
      marks[selected] = { ...marks[selected], selected: true, selectedColor: colors.primary };
    } else {
      marks[selected] = { selected: true, selectedColor: colors.primary, dots: [] };
    }

    return marks;
  }, [events, deadlines, selected, colors]);

  // Items for the selected day, sorted chronologically by start time
  const dayEvents = useMemo(() => {
    const evs = events.filter((e) => e.date === selected);
    const dls = deadlines.filter((d) => d.date === selected);
    const all = [...evs, ...dls];
    return all.sort((a, b) => {
      const ta = a.time || '99:99';
      const tb = b.time || '99:99';
      return ta.localeCompare(tb);
    });
  }, [events, deadlines, selected]);

  async function handleSave(data) {
    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, data);
      } else {
        await addEvent(data);
      }
      return null;
    } catch (error) {
      return error?.message || "Impossible d'enregistrer l'événement.";
    }
  }

  function openEdit(event) {
    setEditingEvent(event);
    setSelected(event.date);
    setVisibleMonth(event.date);
    setShowForm(true);
  }

  function openNew() {
    setEditingEvent(null);
    setShowForm(true);
  }

  const calTheme = {
    backgroundColor: colors.background,
    calendarBackground: colors.background,
    textSectionTitleColor: colors.textSecondary,
    selectedDayBackgroundColor: colors.primary,
    selectedDayTextColor: '#fff',
    todayTextColor: colors.primary,
    dayTextColor: colors.text,
    textDisabledColor: colors.textMuted,
    dotColor: colors.primary,
    monthTextColor: colors.text,
    indicatorColor: colors.primary,
    arrowColor: colors.primary,
    textMonthFontWeight: '700',
    textMonthFontSize: 17,
    textDayFontSize: 14,
    textDayHeaderFontSize: 12,
  };

  return (
    <SafeAreaView className="flex-1" style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View className="mx-auto flex-1 w-full max-w-6xl md:px-4">
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Calendrier</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={openNew}
          >
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <Calendar
          current={visibleMonth}
          onDayPress={(day) => {
            setSelected(day.dateString);
            setVisibleMonth(day.dateString);
          }}
          onMonthChange={(month) => {
            setVisibleMonth(`${month.year}-${String(month.month).padStart(2, '0')}-01`);
          }}
          markedDates={markedDates}
          markingType="multi-dot"
          theme={calTheme}
          style={[styles.calendar, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
          firstDay={1}
          enableSwipeMonths
          renderArrow={(direction) => (
            <Text style={[styles.calendarArrow, { color: colors.primary }]}>
              {direction === 'left' ? '‹' : '›'}
            </Text>
          )}
        />

        {/* Selected day label */}
        <View style={[styles.dayHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.dayLabel, { color: colors.text }]}>
            {selected === today ? "Aujourd'hui" : formatDate(selected)}
          </Text>
          <Text style={[styles.eventCount, { color: colors.textSecondary }]}>
            {dayEvents.length > 0 ? `${dayEvents.length} élément${dayEvents.length > 1 ? 's' : ''}` : 'Rien ce jour'}
          </Text>
        </View>

        <FlatList
          className="flex-1"
          data={dayEvents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            if (item.isDeadline) {
              return (
                <View style={[styles.deadlineCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[styles.deadlineStripe, { backgroundColor: colors.textMuted }]} />
                  <View style={styles.deadlineBody}>
                    <Text style={[styles.deadlineTag, { color: colors.textMuted }]}>⏰ Échéance · {item.listName}</Text>
                    <Text style={[styles.deadlineTitle, { color: colors.text }]}>{item.title}</Text>
                  </View>
                </View>
              );
            }
            return (
              <EventCard
                event={item}
                onEdit={() => openEdit(item)}
                onDelete={async () => {
                  try {
                    await deleteEvent(item.id);
                  } catch (error) {
                    Alert.alert('Erreur', error?.message || "Impossible de supprimer l'événement.");
                    throw error;
                  }
                }}
              />
            );
          }}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucun événement ce jour</Text>
            </View>
          }
        />
      </View>

      <EventForm
        visible={showForm}
        onClose={() => { setShowForm(false); setEditingEvent(null); }}
        onSave={handleSave}
        initialDate={selected}
        event={editingEvent}
      />
    </SafeAreaView>
  );
}

function formatDate(str) {
  const [y, m, d] = str.split('-');
  const months = ['jan.','fév.','mars','avr.','mai','juin','juil.','août','sep.','oct.','nov.','déc.'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 26, lineHeight: 30, fontWeight: '300' },
  calendar: { marginBottom: 0 },
  calendarArrow: { fontSize: 28, fontWeight: '700', paddingHorizontal: 10, lineHeight: 28 },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dayLabel: { fontSize: 16, fontWeight: '700' },
  eventCount: { fontSize: 13 },
  list: { paddingTop: 8, paddingBottom: 20, flexGrow: 1 },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: 14 },
  deadlineCard: {
    flexDirection: 'row',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 5,
    borderWidth: 1,
    overflow: 'hidden',
  },
  deadlineStripe: { width: 5 },
  deadlineBody: { flex: 1, padding: 14 },
  deadlineTag: { fontSize: 11, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' },
  deadlineTitle: { fontSize: 15, fontWeight: '600' },
});
