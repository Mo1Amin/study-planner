import { addDays, dateKey, minutesBetween, parseDateKey } from './date.js';

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function timeToMinutes(value) {
  const [hour, minute] = String(value).split(':').map(Number);
  return hour * 60 + minute;
}

function minutesToTime(value) {
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function eventIsActive(event) {
  return event.status !== 'cancelled';
}

function overlaps(start, end, otherStart, otherEnd) {
  return start < otherEnd && end > otherStart;
}

function findStart(date, duration, state, reserved) {
  const startOfWindow = timeToMinutes(state.settings.studyStart);
  const endOfWindow = timeToMinutes(state.settings.studyEnd);
  const now = new Date();
  const today = dateKey(now);
  const earliest = date === today ? Math.max(startOfWindow, now.getHours() * 60 + now.getMinutes() + 20) : startOfWindow;
  const firstSlot = Math.ceil(earliest / 10) * 10;

  const occupied = [
    ...state.events.filter((event) => event.date === date && eventIsActive(event)),
    ...reserved.filter((event) => event.date === date),
  ].map((event) => {
    const start = timeToMinutes(event.startTime);
    const end = start + Math.max(0, Number(event.durationMinutes) || 0) + (event.reservedBreakMinutes || 0);
    return [start, end];
  });

  for (let start = firstSlot; start + duration <= endOfWindow; start += 10) {
    if (!occupied.some(([occupiedStart, occupiedEnd]) => overlaps(start, start + duration, occupiedStart, occupiedEnd))) {
      return minutesToTime(start);
    }
  }
  return null;
}

function existingStudyMinutesOn(state, date) {
  return state.events
    .filter((event) => event.date === date && event.kind === 'study' && eventIsActive(event))
    .reduce((total, event) => total + (Number(event.durationMinutes) || 0), 0);
}

export function generateStudyPlan(state, now = new Date(), horizonDays = 14) {
  const today = dateKey(now);
  const horizon = addDays(today, horizonDays - 1);
  const dailyGoal = Math.max(30, Number(state.settings.dailyGoalMinutes) || 180);
  const sessionLength = Math.min(180, Math.max(15, Number(state.settings.sessionMinutes) || 50));
  const pauseLength = Math.min(30, Math.max(0, Number(state.settings.breakMinutes) || 0));
  const reserved = [];
  const additions = [];
  const unplanned = [];

  const tasks = state.tasks
    .filter((task) => !task.completed)
    .map((task) => ({
      ...task,
      remaining: Math.max(
        0,
        (Number(task.estimatedMinutes) || sessionLength) - state.events
          .filter((event) => event.taskId === task.id && eventIsActive(event))
          .reduce((sum, event) => sum + (Number(event.durationMinutes) || 0), 0),
      ),
    }))
    .filter((task) => task.remaining > 0)
    .sort((left, right) => {
      const leftDue = left.dueDate || horizon;
      const rightDue = right.dueDate || horizon;
      return leftDue.localeCompare(rightDue)
        || (PRIORITY_ORDER[left.priority] ?? 1) - (PRIORITY_ORDER[right.priority] ?? 1)
        || left.title.localeCompare(right.title, 'ar');
    });

  for (const task of tasks) {
    let remaining = task.remaining;
    const requestedDue = task.dueDate || horizon;
    const dueDate = requestedDue < today ? today : requestedDue;
    const finalDate = dueDate < horizon ? dueDate : horizon;
    const lastCandidate = parseDateKey(finalDate);
    const startCandidate = parseDateKey(today);
    if (!lastCandidate || !startCandidate || lastCandidate < startCandidate) {
      unplanned.push({ task, remaining });
      continue;
    }

    for (let date = today; date <= finalDate && remaining > 0; date = addDays(date, 1)) {
      const used = existingStudyMinutesOn(state, date)
        + additions.filter((event) => event.date === date).reduce((sum, event) => sum + event.durationMinutes, 0);
      const available = Math.max(0, dailyGoal - used);
      if (available < 15) continue;

      const durationMinutes = Math.min(sessionLength, remaining, available);
      if (durationMinutes < 15) continue;
      const startTime = findStart(date, durationMinutes, state, reserved);
      if (!startTime) continue;

      const event = {
        id: `event-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${additions.length}`,
        title: task.title,
        date,
        startTime,
        durationMinutes,
        kind: 'study',
        status: 'planned',
        source: 'auto-plan',
        taskId: task.id,
        subjectId: task.subjectId || null,
      };
      additions.push(event);
      reserved.push({ ...event, reservedBreakMinutes: pauseLength });
      remaining -= durationMinutes;
    }

    if (remaining > 0) unplanned.push({ task, remaining });
  }

  return { events: additions, unplanned };
}

export function getWeeklyStudyMinutes(state, fromDate, days = 7) {
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(fromDate, index);
    const minutes = state.events
      .filter((event) => event.date === date && event.kind === 'study' && event.status === 'completed')
      .reduce((total, event) => total + (Number(event.actualMinutes) || Number(event.durationMinutes) || 0), 0);
    return { date, minutes };
  });
}

export function getTaskCounts(state) {
  const open = state.tasks.filter((task) => !task.completed);
  const today = dateKey();
  return {
    open: open.length,
    completed: state.tasks.length - open.length,
    overdue: open.filter((task) => task.dueDate && task.dueDate < today).length,
    dueSoon: open.filter((task) => task.dueDate && task.dueDate >= today && task.dueDate <= addDays(today, 7)).length,
  };
}

export function getStudyMinutesForDate(state, date = dateKey()) {
  return state.events
    .filter((event) => event.date === date && event.kind === 'study' && event.status === 'completed')
    .reduce((total, event) => total + (Number(event.actualMinutes) || Number(event.durationMinutes) || 0), 0);
}

export function eventEndMinutes(event) {
  return minutesBetween('00:00', event.startTime) + (Number(event.durationMinutes) || 0);
}
