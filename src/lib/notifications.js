import { Platform } from 'react-native';

// ─── Permission ────────────────────────────────────────────────────────────────
export async function requestNotificationPermission() {
  if (Platform.OS !== 'web') return false;
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function notificationsGranted() {
  if (Platform.OS !== 'web') return false;
  if (typeof Notification === 'undefined') return false;
  return Notification.permission === 'granted';
}

// ─── Afficher une notification immédiate ───────────────────────────────────────
export function showNotification(title, body, options = {}) {
  if (!notificationsGranted()) return;
  try {
    new Notification(title, { body, icon: '/favicon.ico', ...options });
  } catch (_) {}
}

// ─── Notification tâche effectuée ─────────────────────────────────────────────
export function notifyTaskDone(taskText) {
  showNotification('Tâche effectuée ✓', taskText);
}

// ─── Rappels de tâches ────────────────────────────────────────────────────────
const scheduledTaskReminders = new Map();

export function clearAllTaskReminders() {
  scheduledTaskReminders.forEach((id) => clearTimeout(id));
  scheduledTaskReminders.clear();
}

/**
 * Planifie des rappels pour une liste d'items ayant un champ `reminderAt` (ISO "YYYY-MM-DDTHH:MM").
 * Les items déjà cochés ou dont le rappel est passé sont ignorés.
 */
export function scheduleTaskReminders(items) {
  if (!notificationsGranted()) return;
  const now = new Date();

  // Annuler tous les anciens rappels de tâches avant de replanifier
  scheduledTaskReminders.forEach((id) => clearTimeout(id));
  scheduledTaskReminders.clear();

  items.forEach((item) => {
    if (!item.reminderAt || item.checked) return;
    const reminderTime = new Date(item.reminderAt);
    const msUntil = reminderTime - now;
    if (msUntil <= 0) return;

    const timeoutId = setTimeout(() => {
      showNotification('Rappel de tâche', item.text || '');
      scheduledTaskReminders.delete(item.id);
    }, msUntil);
    scheduledTaskReminders.set(item.id, timeoutId);
  });
}

// ─── Rappels d'événements ─────────────────────────────────────────────────────
// Stocke les timeoutIds pour pouvoir les annuler
const scheduledReminders = new Map();

export function clearAllReminders() {
  scheduledReminders.forEach((id) => clearTimeout(id));
  scheduledReminders.clear();
}

/**
 * Schedule des rappels pour une liste d'événements.
 * - Rappel 15 min avant l'heure de début si c'est aujourd'hui
 * - Notification au moment exact si c'est aujourd'hui et que le temps n'est pas passé
 */
export function scheduleEventReminders(events) {
  if (!notificationsGranted()) return;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  events.forEach((event) => {
    if (!event.time || event.date !== todayStr) return;

    const [h, m] = event.time.split(':').map(Number);
    const eventTime = new Date();
    eventTime.setHours(h, m, 0, 0);

    const msUntilEvent = eventTime - now;
    const msUntilReminder = msUntilEvent - 15 * 60 * 1000; // 15 min avant

    // Annuler les anciens rappels pour cet event
    if (scheduledReminders.has(event.id + '_reminder')) {
      clearTimeout(scheduledReminders.get(event.id + '_reminder'));
    }
    if (scheduledReminders.has(event.id + '_now')) {
      clearTimeout(scheduledReminders.get(event.id + '_now'));
    }

    // Rappel 15 min avant
    if (msUntilReminder > 0) {
      const id = setTimeout(() => {
        showNotification(
          `Dans 15 min : ${event.title}`,
          [event.time, event.location].filter(Boolean).join(' · '),
        );
      }, msUntilReminder);
      scheduledReminders.set(event.id + '_reminder', id);
    }

    // Notification au moment de l'événement
    if (msUntilEvent > 0) {
      const id = setTimeout(() => {
        showNotification(
          `C'est l'heure : ${event.title}`,
          [event.time, event.location].filter(Boolean).join(' · '),
        );
      }, msUntilEvent);
      scheduledReminders.set(event.id + '_now', id);
    }
  });
}
