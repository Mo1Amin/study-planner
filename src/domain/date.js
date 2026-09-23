const arabicDate = new Intl.DateTimeFormat('ar-EG', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

export function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(value) {
  const [year, month, day] = String(value ?? '').split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 12);
}

export function addDays(value, days) {
  const date = typeof value === 'string' ? parseDateKey(value) : new Date(value);
  if (!date) return '';
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

export function formatDate(value, options = {}) {
  const date = typeof value === 'string' ? parseDateKey(value) : value;
  if (!date) return '—';
  const formatter = options.short
    ? new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short' })
    : arabicDate;
  return formatter.format(date);
}

export function formatMonth(value) {
  const date = typeof value === 'string' ? parseDateKey(value) : value;
  return date ? new Intl.DateTimeFormat('ar-EG', { month: 'long', year: 'numeric' }).format(date) : '';
}

export function formatTime(value) {
  if (!value) return '—';
  const [hour, minute] = value.split(':').map(Number);
  const date = new Date(2020, 0, 1, hour || 0, minute || 0);
  return new Intl.DateTimeFormat('ar-EG', { hour: 'numeric', minute: '2-digit' }).format(date);
}

export function minutesBetween(start, end) {
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  return (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
}

export function weekStart(value, firstDay = 6) {
  const date = typeof value === 'string' ? parseDateKey(value) : new Date(value);
  if (!date) return '';
  const daysBack = (date.getDay() - firstDay + 7) % 7;
  date.setDate(date.getDate() - daysBack);
  return dateKey(date);
}

export function monthCalendarDays(value) {
  const date = typeof value === 'string' ? parseDateKey(value) : new Date(value);
  if (!date) return [];
  const first = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() - 6 + 7) % 7));
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return dateKey(day);
  });
}

export function formatDuration(minutes) {
  const hours = Math.floor(Math.max(0, minutes) / 60);
  const remainder = Math.max(0, minutes) % 60;
  if (!hours) return `${remainder} د`;
  if (!remainder) return `${hours} س`;
  return `${hours} س ${remainder} د`;
}

export function todayGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'صباح هادئ وبداية موفقة';
  if (hour < 17) return 'مساء التركيز';
  return 'وقت مناسب لخطوة صغيرة';
}
