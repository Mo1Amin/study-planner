import { formatDate, formatDuration, formatTime } from '../domain/date.js';

const iconPaths = {
  spark: '<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/><path d="m19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14Z"/>',
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
  route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8a3 3 0 0 0 0-6h-1a3 3 0 0 1 0-6h2"/><circle cx="18" cy="5" r="3"/>',
  chart: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
  settings: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.8-.6a8 8 0 0 1-1.3.8l-.3 1.9h-2.8l-.4-1.9a8 8 0 0 1-1.3-.8l-1.8.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.6l-1.4-1.1 1.4-2.4 1.8.6a8 8 0 0 1 1.3-.8l.4-1.9h2.8l.3 1.9a8 8 0 0 1 1.3.8l1.8-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.5Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  moon: '<path d="M20.9 13A8 8 0 0 1 11 3.1 8 8 0 1 0 20.9 13Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  play: '<path d="m8 5 11 7-11 7z"/>',
  pause: '<path d="M8 5h3v14H8zM15 5h3v14h-3z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M5 21h14"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5M5 20h14"/>',
  arrow: '<path d="M7 17 17 7M7 7h10v10"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.1 0l3-3a5 5 0 0 0-7.1-7.1l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.1 0l-3 3a5 5 0 1 0 7.1 7.1l1.7-1.7"/>',
  idea: '<path d="M9 18h6m-5 4h4M8 14.5A7 7 0 1 1 16 14.5c-.9.8-1.3 1.6-1.5 2.5h-5c-.2-.9-.6-1.7-1.5-2.5Z"/>',
  alert: '<path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/>',
  close: '<path d="m18 6-12 12M6 6l12 12"/>',
  inbox: '<path d="M4 4h16l2 12h-6l-2 3h-4l-2-3H2L4 4Z"/><path d="M2 16h6m8 0h6"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L9 17l-4 1 1-4Z"/>',
};

export function icon(name, size = 18) {
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] ?? iconPaths.spark}</svg>`;
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

export function pageHeading(eyebrow, title, description, action = '') {
  return `<div class="page-heading">
    <div><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1>${escapeHtml(title)}</h1><p class="page-description">${escapeHtml(description)}</p></div>
    ${action ? `<div class="heading-actions">${action}</div>` : ''}
  </div>`;
}

export function button(action, label, iconName, kind = 'secondary', extra = '') {
  return `<button class="button button--${kind}" type="button" data-action="${escapeHtml(action)}" ${extra}>${iconName ? icon(iconName, 16) : ''}<span>${label}</span></button>`;
}

export function selectSubject(subjects, selected = '', id = 'subjectId', optional = false) {
  const options = subjects.map((subject) => `<option value="${escapeHtml(subject.id)}" ${subject.id === selected ? 'selected' : ''}>${escapeHtml(subject.name)}</option>`).join('');
  return `<select id="${id}" name="subjectId" ${optional ? '' : 'required'}>
    ${optional ? '<option value="">من غير مادة</option>' : '<option value="">اختر مادة</option>'}${options}
  </select>`;
}

export function eventCard(event, state, compact = false) {
  const subject = state.subjects.find((item) => item.id === event.subjectId);
  const task = state.tasks.find((item) => item.id === event.taskId);
  const completed = event.status === 'completed';
  const className = event.kind === 'study' ? 'study' : 'appointment';
  return `<article class="event-card event-card--${className} ${completed ? 'is-complete' : ''} ${compact ? 'event-card--compact' : ''}">
    <span class="event-marker" aria-hidden="true"></span>
    <div class="event-card__time">${formatTime(event.startTime)}<span>${formatDuration(event.durationMinutes || 0)}</span></div>
    <div class="event-card__body"><strong>${escapeHtml(event.title)}</strong><span>${escapeHtml(subject?.name || (event.kind === 'study' ? 'جلسة دراسة' : 'موعد'))}${task ? ` · ${escapeHtml(task.title)}` : ''}</span></div>
    ${event.kind === 'study' && !completed ? `<button class="icon-button event-done" type="button" data-action="complete-event" data-id="${escapeHtml(event.id)}" aria-label="إنهاء جلسة ${escapeHtml(event.title)}" title="تمت الجلسة">${icon('check', 15)}</button>` : ''}
    ${completed ? `<span class="status-label status-label--done">${icon('check', 13)} أُنجزت</span>` : ''}
    <button class="icon-button event-delete" type="button" data-action="delete-event" data-id="${escapeHtml(event.id)}" aria-label="حذف ${escapeHtml(event.title)}">${icon('close', 14)}</button>
  </article>`;
}

export function emptyState(title, body, actionLabel, action, iconName = 'inbox') {
  return `<div class="empty-state">${icon(iconName, 24)}<h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p>${actionLabel ? button(action, escapeHtml(actionLabel), 'plus', 'primary') : ''}</div>`;
}
