import {
  addDays,
  dateKey,
  formatDate,
  formatDuration,
  formatMonth,
  formatTime,
  monthCalendarDays,
  parseDateKey,
  weekStart,
} from '../domain/date.js';
import { getStudyMinutesForDate, getTaskCounts, getWeeklyStudyMinutes } from '../domain/planning.js';
import { button, emptyState, escapeHtml, eventCard, icon, pageHeading, selectSubject } from './primitives.js';

const WEEKDAY_NAMES = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
const PRIORITIES = {
  high: { label: 'عالية', className: 'priority--high' },
  medium: { label: 'متوسطة', className: 'priority--medium' },
  low: { label: 'هادئة', className: 'priority--low' },
};

function panelHeading(title, note = '', action = '') {
  return `<div class="panel-heading"><div><h2>${title}</h2>${note ? `<p>${note}</p>` : ''}</div>${action}</div>`;
}

function sortedEvents(events) {
  return [...events].sort((left, right) => `${left.date} ${left.startTime}`.localeCompare(`${right.date} ${right.startTime}`));
}

function dueLabel(task) {
  const today = dateKey();
  if (task.completed) return 'مكتملة';
  if (task.dueDate < today) return 'متأخرة';
  if (task.dueDate === today) return 'اليوم';
  return formatDate(task.dueDate, { short: true });
}

function taskCard(task, state, compact = false) {
  const subject = state.subjects.find((item) => item.id === task.subjectId);
  const priority = PRIORITIES[task.priority] ?? PRIORITIES.medium;
  const sessions = state.events.filter((event) => event.taskId === task.id && event.status === 'completed');
  const studied = sessions.reduce((sum, event) => sum + (Number(event.actualMinutes) || Number(event.durationMinutes) || 0), 0);
  const estimated = Math.max(1, Number(task.estimatedMinutes) || 1);
  const progress = Math.min(100, Math.round(studied / estimated * 100));

  return `<article class="task-card ${task.completed ? 'is-complete' : ''} ${compact ? 'task-card--compact' : ''}">
    <button class="task-check ${task.completed ? 'is-checked' : ''}" type="button" data-action="toggle-task" data-id="${escapeHtml(task.id)}" aria-label="${task.completed ? 'إعادة فتح' : 'إنهاء'} ${escapeHtml(task.title)}">${task.completed ? icon('check', 14) : ''}</button>
    <div class="task-card__content"><div class="task-card__top"><strong>${escapeHtml(task.title)}</strong><span class="priority-tag ${priority.className}">${priority.label}</span></div>
      <div class="task-card__meta"><span>${escapeHtml(subject?.name || 'من غير مادة')}</span><span class="task-due ${!task.completed && task.dueDate < dateKey() ? 'is-overdue' : ''}">${dueLabel(task)}</span><span>${formatDuration(task.estimatedMinutes || 0)}</span></div>
      ${task.note ? `<p class="task-card__note">${escapeHtml(task.note)}</p>` : ''}
      ${studied ? `<div class="task-progress"><span style="width:${progress}%"></span></div>` : ''}
    </div>
    ${!compact ? `<button class="icon-button task-edit" type="button" data-action="edit-task" data-id="${escapeHtml(task.id)}" aria-label="تعديل ${escapeHtml(task.title)}">${icon('edit', 15)}</button>` : ''}
    <button class="icon-button task-delete" type="button" data-action="delete-task" data-id="${escapeHtml(task.id)}" aria-label="حذف ${escapeHtml(task.title)}">${icon('trash', 15)}</button>
  </article>`;
}

function metricCard(label, value, hint, iconName, tone = 'blue') {
  return `<article class="metric-card metric-card--${tone}"><span class="metric-card__icon">${icon(iconName, 18)}</span><p>${label}</p><strong>${value}</strong><span class="metric-card__hint">${hint}</span></article>`;
}

function studyBars(state, fromDate = weekStart(dateKey()), days = 7) {
  const data = getWeeklyStudyMinutes(state, fromDate, days);
  const maxMinutes = Math.max(60, ...data.map((item) => item.minutes));
  return `<div class="study-bars">${data.map(({ date, minutes }) => {
    const height = minutes ? Math.max(9, Math.round(minutes / maxMinutes * 100)) : 3;
    const day = parseDateKey(date);
    const label = day ? new Intl.DateTimeFormat('ar-EG', { weekday: 'short' }).format(day) : '';
    return `<div class="study-bar"><div class="study-bar__track"><span style="height:${height}%" title="${formatDuration(minutes)}"></span></div><strong>${escapeHtml(label)}</strong><small>${minutes ? formatDuration(minutes) : '—'}</small></div>`;
  }).join('')}</div>`;
}

export function renderDashboard(state) {
  const today = dateKey();
  const todayEvents = sortedEvents(state.events.filter((event) => event.date === today && event.status !== 'cancelled'));
  const pendingTasks = state.tasks.filter((task) => !task.completed).sort((left, right) => (left.dueDate || '').localeCompare(right.dueDate || '')).slice(0, 4);
  const counts = getTaskCounts(state);
  const todayMinutes = getStudyMinutesForDate(state);
  const nextSession = sortedEvents(state.events.filter((event) => event.kind === 'study' && event.status === 'planned' && `${event.date} ${event.startTime}` >= `${today} ${new Date().toTimeString().slice(0, 5)}`))[0];
  const goal = Math.max(30, Number(state.settings.dailyGoalMinutes) || 180);
  const progress = Math.min(100, Math.round(todayMinutes / goal * 100));
  const todayDate = new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

  const focusCopy = nextSession
    ? `<p class="focus-next__label">الجلسة القادمة</p><h2>${escapeHtml(nextSession.title)}</h2><p>${formatDate(nextSession.date, { short: true })} · ${formatTime(nextSession.startTime)} · ${formatDuration(nextSession.durationMinutes)}</p><button class="button button--light" type="button" data-action="start-timer" data-id="${escapeHtml(nextSession.id)}">${icon('play', 15)}<span>ابدأ التركيز</span></button>`
    : `<p class="focus-next__label">لحظة تركيز</p><h2>${state.subjects.length ? 'اختَر شيئًا واحدًا وابدأ' : 'ابدأ بإضافة مادة لمذاكرتك'}</h2><p>${state.subjects.length ? 'جلسة قصيرة ومنتظمة أفضل من انتظار الوقت المثالي.' : 'بمجرد إضافة مادة، تقدر تبدأ جلسة وتحفظ تقدمك.'}</p><button class="button button--light" type="button" data-action="${state.subjects.length ? 'start-quick-focus' : 'navigate'}" ${state.subjects.length ? '' : 'data-view="subjects"'}>${icon(state.subjects.length ? 'play' : 'plus', 15)}<span>${state.subjects.length ? 'ابدأ جلسة الآن' : 'أضف أول مادة'}</span></button>`;

  return `<section class="dashboard-view">
    <div class="welcome-row"><div><p class="eyebrow">${escapeHtml(new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(new Date()))}</p><h1>أهلًا بك في مساحة مذاكرتك</h1><p>${escapeHtml(todayDate)} · خذ يومك خطوة بخطوة.</p></div><span class="weather-mark" aria-hidden="true">${icon('spark', 20)}</span></div>
    ${!state.subjects.length && !state.tasks.length ? `<div class="first-run-banner"><div class="first-run-banner__mark">${icon('idea', 21)}</div><div><strong>ابدأ بخطة تشبه يومك</strong><p>أضف مادة ومهمة واحدة؛ ومنظمي يرتب الباقي حول وقتك المتاح.</p></div>${button('load-demo', 'جرّب مثالًا', 'arrow', 'quiet')}</div>` : ''}
    <div class="metric-grid">
      ${metricCard('وقت المذاكرة اليوم', formatDuration(todayMinutes), `من هدف ${formatDuration(goal)}`, 'clock', 'teal')}
      ${metricCard('مهام قريبة', counts.dueSoon, counts.overdue ? `${counts.overdue} متأخرة` : 'خلال الأسبوع القادم', 'check', counts.overdue ? 'coral' : 'blue')}
      ${metricCard('المواد النشطة', state.subjects.length, 'مواد مرتبطة بخطتك', 'book', 'sand')}
      ${metricCard('جلسات اليوم', todayEvents.filter((event) => event.kind === 'study').length, `${todayEvents.length} نشاط في جدولك`, 'calendar', 'lilac')}
    </div>
    <div class="dashboard-columns">
      <div class="dashboard-primary">
        <section class="focus-feature"><div class="focus-feature__decoration" aria-hidden="true"></div><div class="focus-feature__copy"><p class="eyebrow eyebrow--light">مساحة تركيز</p>${focusCopy}</div><div class="focus-ring" style="--progress:${progress}%"><div><strong>${progress}<small>%</small></strong><span>من هدف اليوم</span></div></div></section>
        <section class="panel dashboard-agenda">${panelHeading('خطة اليوم', 'مواعيدك وجلسات المذاكرة المحفوظة', button('navigate', 'افتح الجدول', 'left', 'quiet', 'data-view="week"'))}
          ${todayEvents.length ? `<div class="event-list">${todayEvents.slice(0, 4).map((event) => eventCard(event, state)).join('')}</div>` : emptyState('اليوم متروك لك', 'أضف جلسة أو موعدًا حتى تظل خطتك واقعية.', 'رتّب الأسبوع', 'navigate', 'calendar')}
        </section>
      </div>
      <div class="dashboard-secondary">
        <section class="panel">${panelHeading('خطوتك التالية', `${counts.open} مهمة مفتوحة`, button('navigate', 'المهام', 'left', 'quiet', 'data-view="tasks"'))}
          ${pendingTasks.length ? `<div class="task-list task-list--small">${pendingTasks.map((task) => taskCard(task, state, true)).join('')}</div>` : emptyState('قائمة خفيفة', 'لا توجد مهام معلّقة الآن.', 'أضف مهمة', 'navigate', 'check')}
        </section>
        <section class="panel weekly-panel">${panelHeading('إيقاع أسبوعك', 'الدقائق التي سجّلتها بعد إنهاء الجلسات')}${studyBars(state)}<div class="chart-footnote">وقت المذاكرة المكتمل فقط يدخل في هذا الرسم.</div></section>
      </div>
    </div>
  </section>`;
}

function renderWeekGrid(state, viewOffset, selectedDate) {
  const start = addDays(weekStart(dateKey()), viewOffset * 7);
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  return `<div class="week-grid">${days.map((date, index) => {
    const events = sortedEvents(state.events.filter((event) => event.date === date && event.status !== 'cancelled'));
    const dateObject = parseDateKey(date);
    return `<button class="week-day ${date === dateKey() ? 'is-today' : ''} ${date === selectedDate ? 'is-selected' : ''}" type="button" data-action="set-selected-date" data-date="${date}">
      <span>${WEEKDAY_NAMES[index]}</span><strong>${dateObject?.getDate() ?? ''}</strong><span class="week-day__events">${events.length ? events.map((event) => `<i class="${event.kind === 'study' ? 'is-study' : 'is-appointment'}" aria-label="${escapeHtml(event.title)}"></i>`).join('') : '<i class="is-empty"></i>'}</span>
    </button>`;
  }).join('')}</div>`;
}

function renderMonthGrid(state, monthOffset, selectedDate) {
  const now = new Date();
  const monthDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1, 12);
  const currentMonthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
  return `<div class="month-grid-wrap"><div class="month-weekdays">${WEEKDAY_NAMES.map((day) => `<span>${day}</span>`).join('')}</div><div class="month-grid">${monthCalendarDays(monthDate).map((date) => {
    const dateParts = date.split('-');
    const monthKey = `${dateParts[0]}-${dateParts[1]}`;
    const events = state.events.filter((event) => event.date === date && event.status !== 'cancelled');
    return `<button class="month-day ${monthKey !== currentMonthKey ? 'is-outside' : ''} ${date === dateKey() ? 'is-today' : ''} ${date === selectedDate ? 'is-selected' : ''}" type="button" data-action="set-selected-date" data-date="${date}"><span>${Number(dateParts[2])}</span><i class="month-day__dots">${events.slice(0, 4).map((event) => `<b class="${event.kind === 'study' ? 'is-study' : 'is-appointment'}"></b>`).join('')}</i></button>`;
  }).join('')}</div></div>`;
}

function eventForm(state, selectedDate) {
  return `<details class="panel form-panel" id="event-form-panel"><summary>${icon('plus', 16)}<span>أضف نشاطًا للجدول</span><span class="summary-caption">جلسة، محاضرة، أو موعد</span></summary>
    <form class="form-grid" id="event-form">
      <label class="field field--wide"><span>اسم النشاط</span><input name="title" maxlength="90" placeholder="مثل: مراجعة المحاضرة الرابعة" required /></label>
      <label class="field"><span>النوع</span><select name="kind"><option value="study">جلسة مذاكرة</option><option value="appointment">موعد أو محاضرة</option></select></label>
      <label class="field"><span>التاريخ</span><input name="date" type="date" value="${selectedDate}" required /></label>
      <label class="field"><span>وقت البداية</span><input name="startTime" type="time" value="${escapeHtml(state.settings.studyStart || '16:00')}" required /></label>
      <label class="field"><span>المدة</span><select name="durationMinutes"><option value="25">25 دقيقة</option><option value="50" selected>50 دقيقة</option><option value="75">75 دقيقة</option><option value="90">ساعة ونصف</option></select></label>
      <label class="field"><span>المادة</span>${selectSubject(state.subjects, '', 'event-subject', true)}</label>
      <label class="field"><span>المهمة المرتبطة</span><select name="taskId"><option value="">من غير مهمة</option>${state.tasks.filter((task) => !task.completed).map((task) => `<option value="${escapeHtml(task.id)}">${escapeHtml(task.title)}</option>`).join('')}</select></label>
      <button class="button button--primary field--wide" type="submit">${icon('plus', 16)}<span>أضف إلى الجدول</span></button>
    </form>
  </details>`;
}

export function renderSchedule(state, context) {
  const { viewOffset = 0, calendarMode = 'week', selectedDate = dateKey() } = context;
  const start = calendarMode === 'week'
    ? addDays(weekStart(dateKey()), viewOffset * 7)
    : dateKey(new Date(new Date().getFullYear(), new Date().getMonth() + viewOffset, 1, 12));
  const end = calendarMode === 'week' ? addDays(start, 6) : addDays(start, 30);
  const selectedEvents = sortedEvents(state.events.filter((event) => event.date === selectedDate && event.status !== 'cancelled'));
  const monthNavLabel = formatMonth(start);
  const rangeLabel = calendarMode === 'week' ? `${formatDate(start, { short: true })} – ${formatDate(end, { short: true })}` : monthNavLabel;
  const planLabel = state.tasks.some((task) => !task.completed)
    ? button('generate-plan', 'خطّط المهام تلقائيًا', 'spark', 'primary')
    : button('navigate', 'أضف مهمة لتخطيطها', 'plus', 'primary', 'data-view="tasks"');

  return `<section>
    ${pageHeading('إدارة الوقت', 'جدول يناسب أسبوعك', 'اجمع جلسات المذاكرة والمواعيد في مكان واحد، وعدّلها حسب وقتك الفعلي.', planLabel)}
    <div class="schedule-toolbar panel"><div class="view-switch" role="group" aria-label="طريقة عرض الجدول"><button class="${calendarMode === 'week' ? 'is-active' : ''}" aria-pressed="${calendarMode === 'week'}" type="button" data-action="calendar-mode" data-mode="week">أسبوع</button><button class="${calendarMode === 'month' ? 'is-active' : ''}" aria-pressed="${calendarMode === 'month'}" type="button" data-action="calendar-mode" data-mode="month">شهر</button></div>
      <div class="date-navigation"><button class="icon-button" type="button" data-action="calendar-prev" aria-label="الفترة السابقة">${icon('right', 17)}</button><strong>${escapeHtml(rangeLabel)}</strong><button class="icon-button" type="button" data-action="calendar-next" aria-label="الفترة التالية">${icon('left', 17)}</button><button class="button button--quiet button--today" type="button" data-action="calendar-today">اليوم</button></div>
      <span class="schedule-legend"><i class="is-study"></i> مذاكرة <i class="is-appointment"></i> موعد</span>
    </div>
    ${calendarMode === 'week' ? renderWeekGrid(state, viewOffset, selectedDate) : renderMonthGrid(state, viewOffset, selectedDate)}
    <div class="schedule-lower"><section class="panel selected-day-panel">${panelHeading(`نشاط ${escapeHtml(formatDate(selectedDate))}`, selectedDate === dateKey() ? 'قائمة اليوم' : 'اضغط على يوم آخر لعرض أنشطته')}
       ${selectedEvents.length ? `<div class="event-list">${selectedEvents.map((event) => eventCard(event, state)).join('')}</div>` : emptyState('لا يوجد شيء في هذا اليوم', 'اترك مساحة للراحة، أو أضف جلسة تناسبك.', 'أضف نشاطًا', 'open-event-form')}
      </section>${eventForm(state, selectedDate)}</div>
    ${state.tasks.some((task) => !task.completed) ? `<div class="auto-plan-note">${icon('spark', 17)}<p><strong>الخطة التلقائية تراعي يومك.</strong> رتّب المهام قبل موعدها، ووزّع الجلسات على ساعات الدراسة التي حددتها.</p>${button('generate-plan', 'أنشئ الخطة', 'arrow', 'quiet')}</div>` : ''}
  </section>`;
}

function taskFilters(filter) {
  const options = [['all', 'الكل'], ['open', 'المعلّقة'], ['overdue', 'المتأخرة'], ['completed', 'المكتملة']];
  return `<div class="filter-tabs" role="group" aria-label="تصفية المهام">${options.map(([value, label]) => `<button class="${filter === value ? 'is-active' : ''}" type="button" aria-pressed="${filter === value}" data-action="task-filter" data-filter="${value}">${label}</button>`).join('')}</div>`;
}

function taskEditDialog(state) {
  return `<dialog class="edit-dialog" id="task-edit-dialog" aria-labelledby="task-edit-title">
    <div class="dialog-heading"><div><p class="eyebrow">تحديث الخطة</p><h2 id="task-edit-title">تعديل المهمة</h2></div><button class="icon-button" type="button" data-action="close-task-edit" aria-label="إغلاق نافذة تعديل المهمة">${icon('close', 17)}</button></div>
    <form id="task-edit-form" class="form-grid">
      <input type="hidden" name="taskId" />
      <label class="field field--wide"><span>اسم المهمة</span><input name="title" maxlength="90" required /></label>
      <label class="field"><span>المادة</span>${selectSubject(state.subjects, '', 'task-edit-subject', true)}</label>
      <label class="field"><span>موعد الإنجاز</span><input type="date" name="dueDate" required /></label>
      <label class="field"><span>الأولوية</span><select name="priority"><option value="high">عالية</option><option value="medium">متوسطة</option><option value="low">عادية</option></select></label>
      <label class="field"><span>الوقت المطلوب بالدقائق</span><input type="number" min="15" max="600" step="5" name="estimatedMinutes" required /></label>
      <label class="field field--wide"><span>الخطوة التالية <small>اختياري</small></span><textarea name="note" rows="2" maxlength="120"></textarea></label>
      <div class="dialog-actions field--wide"><button class="button button--quiet" type="button" data-action="close-task-edit">إلغاء</button><button class="button button--primary" type="submit">${icon('check', 15)}<span>احفظ التعديل</span></button></div>
    </form>
  </dialog>`;
}

export function renderTasks(state, context = {}) {
  const filter = context.taskFilter || 'all';
  const tasks = [...state.tasks].sort((left, right) => (left.completed - right.completed) || (left.dueDate || '').localeCompare(right.dueDate || ''));
  const visible = tasks.filter((task) => {
    if (filter === 'completed') return task.completed;
    if (filter === 'open') return !task.completed;
    if (filter === 'overdue') return !task.completed && task.dueDate < dateKey();
    return true;
  });
  const counts = getTaskCounts(state);
  return `<section>${pageHeading('مهامك الدراسية', 'كل مهمة لها خطوة تالية', 'اربط المهمة بمادة وموعد، وقدّر الوقت المطلوب عشان تدخل في خطة قابلة للتنفيذ.', button('open-task-form', 'أضف مهمة', 'plus', 'primary'))}
    <div class="task-summary-strip"><span>${icon('check', 17)} <strong>${counts.open}</strong> مفتوحة</span><span>${icon('clock', 17)} <strong>${counts.dueSoon}</strong> مستحقة قريبًا</span><span class="${counts.overdue ? 'has-overdue' : ''}">${icon('alert', 17)} <strong>${counts.overdue}</strong> متأخرة</span></div>
    <div class="tasks-layout"><section class="panel task-board">${panelHeading('قائمة المهام', 'رتبها حسب الموعد والأولوية', taskFilters(filter))}
       ${visible.length ? `<div class="task-list">${visible.map((task) => taskCard(task, state)).join('')}</div>` : emptyState(filter === 'completed' ? 'لسه مفيش مهام مكتملة' : filter === 'overdue' ? 'ولا مهمة متأخرة' : 'القائمة جاهزة لبدايتك', filter === 'overdue' ? 'أحسنت، كل مهامك داخل الوقت.' : 'أضف مهمة واحدة واضحة وخصص لها وقتًا.', 'أضف مهمة', 'open-task-form', 'check')}
    </section><details class="panel form-panel task-form-panel" id="task-form-panel" open>
      ${panelHeading('مهمة جديدة', 'حدد الناتج والوقت المتوقع')}
      ${!state.subjects.length ? `<p class="inline-note">إضافة مادة أولًا تجعل الخطة أدق. <button class="text-button" data-action="navigate" data-view="subjects" type="button">أضف مادة</button></p>` : ''}
      <form class="form-grid" id="task-form">
        <label class="field field--wide"><span>اسم المهمة</span><input name="title" maxlength="90" placeholder="مثل: حل أسئلة الفصل الثاني" required /></label>
        <label class="field"><span>المادة</span>${selectSubject(state.subjects)}</label>
        <label class="field"><span>موعد الإنجاز</span><input type="date" name="dueDate" value="${addDays(dateKey(), 3)}" required /></label>
        <label class="field"><span>الأولوية</span><select name="priority"><option value="high">عالية</option><option value="medium" selected>متوسطة</option><option value="low">عادية</option></select></label>
        <label class="field"><span>الوقت المطلوب</span><select name="estimatedMinutes"><option value="25">25 دقيقة</option><option value="50" selected>50 دقيقة</option><option value="100">ساعة و40 دقيقة</option><option value="150">ساعتان ونصف</option><option value="240">4 ساعات</option></select></label>
        <label class="field field--wide"><span>خطوتك التالية <small>اختياري</small></span><input name="note" maxlength="120" placeholder="ما أول شيء ستفعله؟" /></label>
        <button class="button button--primary field--wide" type="submit">${icon('plus', 16)}<span>احفظ المهمة</span></button>
      </form>
    </details></div>
  </section>${taskEditDialog(state)}`;
}

const subjectPalette = ['#3f766c', '#527398', '#ad7046', '#8271a1', '#7a8a4b', '#bd665d'];

function subjectCard(subject, state, index) {
  const subjectTasks = state.tasks.filter((task) => task.subjectId === subject.id);
  const done = subjectTasks.filter((task) => task.completed).length;
  const hours = state.events.filter((event) => event.subjectId === subject.id && event.kind === 'study' && event.status === 'completed').reduce((sum, event) => sum + (Number(event.actualMinutes) || Number(event.durationMinutes) || 0), 0);
  const target = Math.max(60, Number(subject.weeklyGoalMinutes) || 300);
  const percent = Math.min(100, Math.round(hours / target * 100));
  const color = subject.color || subjectPalette[index % subjectPalette.length];
  return `<article class="subject-card"><div class="subject-card__top"><span class="subject-emblem" style="--subject-color:${escapeHtml(color)}">${icon('book', 20)}</span><button class="icon-button subject-delete" type="button" data-action="delete-subject" data-id="${escapeHtml(subject.id)}" aria-label="حذف مادة ${escapeHtml(subject.name)}">${icon('trash', 15)}</button></div>
    <h2>${escapeHtml(subject.name)}</h2><p>${escapeHtml(subject.note || 'مساحة لمتابعة تقدمك في المادة.')}</p>
    <div class="subject-stats"><span><strong>${formatDuration(hours)}</strong><small>مذاكرة هذا الأسبوع</small></span><span><strong>${done}/${subjectTasks.length}</strong><small>مهام منجزة</small></span></div>
    <div class="subject-progress"><span style="width:${percent}%;--subject-color:${escapeHtml(color)}"></span></div><div class="subject-goal-label"><span>هدف ${formatDuration(target)}</span><span>${percent}%</span></div>
  </article>`;
}

export function renderSubjects(state) {
  return `<section>${pageHeading('المواد', 'اعرف أين يذهب جهدك', 'اجمع المهام والجلسات حسب المادة، وحدد هدفًا أسبوعيًا واقعيًا لكل واحدة.', button('focus-subject-form', 'أضف مادة', 'plus', 'primary'))}
    <div class="subject-overview"><div><span class="eyebrow">موادك الحالية</span><strong>${state.subjects.length}</strong></div><p>وقت الدراسة يظهر عند إنهاء جلسة مرتبطة بالمادة.</p></div>
    ${state.subjects.length ? `<div class="subject-grid">${state.subjects.map((subject, index) => subjectCard(subject, state, index)).join('')}</div>` : emptyState('ابدأ بمادتين مهمتين', 'ربط المهام بمادتها يساعدنا نوزع وقتك ونكشف التراكم بدري.', 'أضف أول مادة', 'focus-subject-form', 'book')}
    <details class="panel form-panel subject-form-panel" id="subject-form-panel" ${state.subjects.length ? '' : 'open'}>${panelHeading('إضافة مادة', 'اسم واضح وهدف أسبوعي قابل للاستمرار')}<form id="subject-form" class="form-grid">
      <label class="field field--wide"><span>اسم المادة</span><input name="name" maxlength="60" placeholder="مثل: التشريح" required /></label>
      <label class="field"><span>وقت المذاكرة أسبوعيًا</span><select name="weeklyGoalMinutes"><option value="120">ساعتان</option><option value="300" selected>5 ساعات</option><option value="480">8 ساعات</option><option value="600">10 ساعات</option></select></label>
      <label class="field"><span>ملاحظة</span><input name="note" maxlength="100" placeholder="مصدر المذاكرة أو أهم فصل" /></label>
      <button class="button button--primary field--wide" type="submit">${icon('plus', 16)}<span>أضف المادة</span></button>
    </form></details>
  </section>`;
}

function defaultMapPosition(type, index, total) {
  if (type === 'subject') return { x: 26, y: Math.min(85, 20 + index * (total > 2 ? 62 / (total - 1) : 28)) };
  if (type === 'task') return { x: 74, y: Math.min(86, 20 + index * (total > 2 ? 62 / (total - 1) : 28)) };
  return { x: 49, y: 50 + ((index % 3) - 1) * 15 };
}

function getMapNodes(state) {
  const linkedTaskIds = new Set(state.links.flatMap((link) => [link.from, link.to]).filter((nodeId) => nodeId.startsWith('task:')).map((nodeId) => nodeId.slice(5)));
  const base = [
    ...state.subjects.map((item) => ({ ...item, type: 'subject', nodeId: `subject:${item.id}` })),
    ...state.tasks.filter((item) => !item.completed || linkedTaskIds.has(item.id)).map((item) => ({ ...item, type: 'task', nodeId: `task:${item.id}` })),
    ...state.ideas.map((item) => ({ ...item, type: 'idea', nodeId: `idea:${item.id}` })),
  ];
  const seenTypes = new Map();
  return base.map((item) => {
    const index = seenTypes.get(item.type) || 0;
    seenTypes.set(item.type, index + 1);
    const position = state.mapPositions[item.nodeId] || defaultMapPosition(item.type, index, base.filter((node) => node.type === item.type).length);
    return { ...item, x: Math.max(10, Math.min(90, Number(position.x) || 50)), y: Math.max(12, Math.min(88, Number(position.y) || 50)) };
  });
}

function renderMapConnections(state, nodes) {
  const positions = new Map(nodes.map((node) => [node.nodeId, node]));
  const lines = [];
  state.tasks.filter((task) => !task.completed && task.subjectId).forEach((task) => {
    const from = positions.get(`subject:${task.subjectId}`);
    const to = positions.get(`task:${task.id}`);
    if (from && to) lines.push({ from, to, derived: true, key: `auto:${task.id}` });
  });
  state.links.forEach((link) => {
    const from = positions.get(link.from);
    const to = positions.get(link.to);
    if (from && to) lines.push({ from, to, derived: false, key: link.id });
  });
  return lines.map(({ from, to, derived, key }) => {
    const middle = (from.x + to.x) / 2;
    return `<path class="map-connection ${derived ? 'is-derived' : ''}" data-link="${escapeHtml(key)}" data-from="${escapeHtml(from.nodeId)}" data-to="${escapeHtml(to.nodeId)}" d="M ${from.x} ${from.y} C ${middle} ${from.y}, ${middle} ${to.y}, ${to.x} ${to.y}" />`;
  }).join('');
}

function mapNode(node, connectFrom = '') {
  const iconName = node.type === 'subject' ? 'book' : node.type === 'task' ? 'check' : 'idea';
  const label = node.type === 'subject' ? 'مادة' : node.type === 'task' ? (node.completed ? 'مهمة مكتملة' : 'مهمة') : 'فكرة';
  const description = node.type === 'task' ? formatDate(node.dueDate, { short: true }) : node.type === 'subject' ? 'محور المذاكرة' : (node.note || 'فكرة جديدة');
  return `<button class="map-node map-node--${node.type} ${connectFrom === node.nodeId ? 'is-link-source' : ''}" style="left:${node.x}%;top:${node.y}%" type="button" data-node="${escapeHtml(node.nodeId)}" data-action="map-node" aria-describedby="map-keyboard-help" aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown" aria-pressed="${connectFrom === node.nodeId}" aria-label="${label}: ${escapeHtml(node.title || node.name)}">
    <span class="map-node__icon">${icon(iconName, 17)}</span><span class="map-node__copy"><small>${label}</small><strong>${escapeHtml(node.title || node.name)}</strong><em>${escapeHtml(description)}</em></span>
  </button>`;
}

export function renderMap(state, context) {
  const nodes = getMapNodes(state);
  const connectMode = context.connectMode || false;
  const connectFrom = context.connectFrom || '';
  const links = state.links.map((link) => `<li><span>${escapeHtml(link.label || 'علاقة')}</span><small>${escapeHtml(link.fromLabel || '')} ← ${escapeHtml(link.toLabel || '')}</small><button type="button" class="icon-button" data-action="delete-link" data-id="${escapeHtml(link.id)}" aria-label="إزالة العلاقة">${icon('close', 15)}</button></li>`).join('');
  return `<section>${pageHeading('خريطة العلاقات', 'خلّي الصورة الكبيرة واضحة', 'اسحب العناصر لترتيبها، ثم اربط الأفكار والمهام والمواد بأسهم.', button('connect-mode', connectMode ? 'ألغِ الربط' : 'اربط عنصرين', connectMode ? 'close' : 'link', connectMode ? 'primary' : 'secondary', `aria-pressed="${connectMode}"`))}
    <div class="map-toolbar"><div class="map-help">${icon(connectMode ? 'link' : 'idea', 17)}<p>${connectMode ? (connectFrom ? 'اختَر العنصر الثاني لإكمال السهم.' : 'اختَر نقطة البداية للرابط.') : 'العلاقات المنقطة تتبع مادة كل مهمة تلقائيًا.'}</p></div><button class="button button--quiet" type="button" data-action="open-idea-form">${icon('plus', 15)}<span>أضف فكرة</span></button></div>
    ${nodes.length ? `<div class="map-layout"><div class="map-board ${connectMode ? 'is-connecting' : ''}" id="map-board" dir="ltr" aria-label="مخطط علاقات تفاعلي">
       <svg class="map-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="map-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker></defs>${renderMapConnections(state, nodes)}</svg>
       ${nodes.map((node) => mapNode(node, connectFrom)).join('')}
       <div class="map-axis map-axis--source">المعرفة</div><div class="map-axis map-axis--result">الخطوات</div>
      </div><aside class="map-side"><section class="panel map-relations">${panelHeading('العلاقات', `${state.links.length} رابط يدوي`)}${links ? `<ul>${links}</ul>` : '<p class="muted-copy">ابدأ بربط فكرة بمهمة، أو مادتين تحتاجان إلى مراجعة مشتركة.</p>'}</section>
        <section class="map-guide"><strong>كيف تستخدم الخريطة؟</strong><p id="map-keyboard-help">حرّك البطاقات بالسحب أو بمفاتيح الأسهم. للربط، اضغط «اربط عنصرين»، واختر نقطة البداية ثم العنصر الثاني.</p><span><i class="map-guide__auto"></i> علاقة تلقائية للمادة والمهمة</span><span><i class="map-guide__manual"></i> علاقة أضفتها بنفسك</span></section></aside></div>` : emptyState('خريطتك تبدأ من عناصر خطتك', 'أضف مادة أو مهمة، ثم اجمع العناصر المترابطة في مخطط واحد.', 'أضف مادة', 'navigate', 'route')}
    <details class="panel form-panel idea-form-panel" id="idea-form-panel"><summary>${icon('plus', 16)}<span>أضف فكرة للخريطة</span><span class="summary-caption">مفهوم، سؤال، أو هدف</span></summary><form class="form-grid" id="idea-form"><label class="field"><span>اسم الفكرة</span><input name="title" maxlength="60" placeholder="مثل: آلية الالتهاب" required /></label><label class="field"><span>ملاحظة قصيرة</span><input name="note" maxlength="100" placeholder="ما الذي تريد تذكره؟" /></label><button class="button button--primary field--wide" type="submit">${icon('plus', 16)}<span>أضف إلى الخريطة</span></button></form></details>
  </section>`;
}

export function renderInsights(state) {
  const weekStartDate = weekStart(dateKey());
  const weekly = getWeeklyStudyMinutes(state, weekStartDate);
  const weeklyMinutes = weekly.reduce((sum, item) => sum + item.minutes, 0);
  const goal = Math.max(60, state.subjects.reduce((sum, subject) => sum + (Number(subject.weeklyGoalMinutes) || 0), 0));
  const goalPercent = goal ? Math.min(100, Math.round(weeklyMinutes / goal * 100)) : 0;
  const counts = getTaskCounts(state);
  const completed = state.tasks.filter((task) => task.completed).length;
  const taskPercent = state.tasks.length ? Math.round(completed / state.tasks.length * 100) : 0;
  const subjectMinutes = state.subjects.map((subject) => ({
    subject,
    minutes: state.events.filter((event) => event.subjectId === subject.id && event.kind === 'study' && event.status === 'completed').reduce((sum, event) => sum + (Number(event.actualMinutes) || Number(event.durationMinutes) || 0), 0),
  })).sort((left, right) => right.minutes - left.minutes);
  return `<section>${pageHeading('مراجعة أسبوعية', 'التقدم أوضح من الإحساس', 'الأرقام هنا مبنية على جلسات أكملتها فعلًا، مش وقت خططت له فقط.')}
    <div class="insight-lead"><div><span class="eyebrow eyebrow--light">ساعات التركيز المسجلة</span><strong>${formatDuration(weeklyMinutes)}</strong><p>الأسبوع الحالي · من ${formatDate(weekStartDate, { short: true })}</p></div><div class="insight-goal"><span>${goalPercent}%</span><small>من أهداف موادك الأسبوعية</small><div class="progress-rail"><i style="width:${goalPercent}%"></i></div></div>${icon('chart', 42)}</div>
    <div class="insights-grid"><section class="panel">${panelHeading('توزيع وقتك خلال الأسبوع', 'كل عمود يمثل جلسة أُنجزت وسُجل وقتها.')}${studyBars(state)}<div class="chart-footnote">المجموع المسجل: <strong>${formatDuration(weeklyMinutes)}</strong></div></section>
      <section class="panel completion-panel">${panelHeading('إنجاز المهام', 'النسبة محسوبة من المهام التي أضفتها')}<div class="completion-ring" style="--progress:${taskPercent}%"><div><strong>${taskPercent}%</strong><span>مكتمل</span></div></div><div class="completion-stats"><span>${completed} من ${state.tasks.length} مهام</span><span>${counts.open} متبقية</span></div></section>
      <section class="panel subject-insights">${panelHeading('وقت المذاكرة حسب المادة', 'جلسات مكتملة فقط')}${subjectMinutes.length ? subjectMinutes.map(({ subject, minutes }, index) => `<div class="subject-insight-row"><span class="subject-insight-index">${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(subject.name)}</strong><span class="subject-insight-bar"><i style="width:${weeklyMinutes ? Math.min(100, minutes / Math.max(1, ...subjectMinutes.map((item) => item.minutes)) * 100) : 0}%"></i></span><small>${formatDuration(minutes)}</small></div>`).join('') : emptyState('أضف مادة لتبدأ المتابعة', 'اربط جلساتك بها ثم أكملها لتظهر هنا.', '', '', 'book')}</section>
      <aside class="insight-coach">${icon('spark', 19)}<div><strong>خطة واقعية أحسن من أسبوع مزدحم</strong><p>لو وقتك قليل، قلّل طول الجلسة أو عدد المهام قبل زيادة ساعات الجدول.</p></div></aside>
    </div>
  </section>`;
}

export function renderSettings(state, durableStorage) {
  const settings = state.settings;
  return `<section>${pageHeading('مساحتك', 'إعدادات تساعدك تستمر', 'اختر وقتًا يناسب إيقاع يومك. التعديلات تحفظ على هذا الجهاز تلقائيًا.')}
    <div class="settings-layout"><section class="panel">${panelHeading('إيقاع المذاكرة', 'يستخدم منظمي هذه الحدود عند توزيع المهام تلقائيًا.')}
      <form id="settings-form" class="form-grid settings-form">
        <label class="field"><span>هدف الدراسة اليومي</span><select name="dailyGoalMinutes"><option value="60" ${settings.dailyGoalMinutes === 60 ? 'selected' : ''}>ساعة</option><option value="120" ${settings.dailyGoalMinutes === 120 ? 'selected' : ''}>ساعتان</option><option value="180" ${settings.dailyGoalMinutes === 180 ? 'selected' : ''}>3 ساعات</option><option value="240" ${settings.dailyGoalMinutes === 240 ? 'selected' : ''}>4 ساعات</option><option value="300" ${settings.dailyGoalMinutes === 300 ? 'selected' : ''}>5 ساعات</option></select></label>
        <label class="field"><span>طول جلسة التركيز</span><select name="sessionMinutes"><option value="25" ${settings.sessionMinutes === 25 ? 'selected' : ''}>25 دقيقة</option><option value="40" ${settings.sessionMinutes === 40 ? 'selected' : ''}>40 دقيقة</option><option value="50" ${settings.sessionMinutes === 50 ? 'selected' : ''}>50 دقيقة</option><option value="75" ${settings.sessionMinutes === 75 ? 'selected' : ''}>75 دقيقة</option><option value="90" ${settings.sessionMinutes === 90 ? 'selected' : ''}>90 دقيقة</option></select></label>
        <label class="field"><span>الاستراحة بين الجلسات</span><select name="breakMinutes"><option value="0" ${settings.breakMinutes === 0 ? 'selected' : ''}>بدون استراحة محددة</option><option value="5" ${settings.breakMinutes === 5 ? 'selected' : ''}>5 دقائق</option><option value="10" ${settings.breakMinutes === 10 ? 'selected' : ''}>10 دقائق</option><option value="15" ${settings.breakMinutes === 15 ? 'selected' : ''}>15 دقيقة</option></select></label>
        <div class="field field--group"><span>الوقت المتاح للدراسة</span><div><input aria-label="بداية وقت الدراسة" name="studyStart" type="time" value="${escapeHtml(settings.studyStart)}" required /><span>إلى</span><input aria-label="نهاية وقت الدراسة" name="studyEnd" type="time" value="${escapeHtml(settings.studyEnd)}" required /></div></div>
        <button class="button button--primary" type="submit">${icon('check', 16)}<span>حفظ الإعدادات</span></button>
      </form>
    </section>
    <section class="panel settings-data-panel">${panelHeading('بياناتك ونسختك الاحتياطية', 'حفظ تلقائي محلي. لا تُرسل موادك أو مهامك إلى خادم.')}
      <div class="storage-status ${durableStorage ? 'is-ready' : 'is-fallback'}"><span class="storage-status__dot"></span><div><strong>${durableStorage ? 'الحفظ التلقائي مفعّل' : 'الحفظ المحلي البديل مفعّل'}</strong><p>${durableStorage ? 'البيانات محفوظة في قاعدة محلية مستقرة داخل المتصفح.' : 'يُستخدم تخزين المتصفح البديل. احتفظ بنسخة احتياطية دورية.'}</p></div></div>
      <div class="data-actions">${button('export-data', 'نزّل نسخة احتياطية', 'download', 'secondary')}${button('import-data', 'استعد من نسخة', 'upload', 'quiet')}</div>
      <div class="settings-divider"></div><div class="theme-choice"><div><strong>مظهر هادئ</strong><p>اختيارك يحفظ في هذه المساحة فقط.</p></div><button class="toggle-switch ${settings.theme === 'dark' ? 'is-on' : ''}" type="button" role="switch" aria-checked="${settings.theme === 'dark'}" data-action="toggle-theme"><span></span><span class="sr-only">تغيير المظهر</span></button></div>
      <div class="settings-divider"></div><button class="text-button text-button--danger" type="button" data-action="reset-data">امسح بيانات هذه المساحة</button>
    </section></div>
    <section class="panel tools-note"><span class="tools-note__mark">${icon('book', 19)}</span><div><strong>لا يحتاج منظمي إلى خادم PHP أو تسجيل دخول</strong><p>نسختك محفوظة على جهازك. استعمل التصدير والاستيراد لنقلها يدويًا بين الأجهزة؛ المزامنة المباشرة تحتاج خدمة خلفية وحسابًا آمنًا.</p></div></section>
  </section>`;
}

export function renderView(view, state, context, durableStorage) {
  switch (view) {
    case 'week': return renderSchedule(state, context);
    case 'tasks': return renderTasks(state, context);
    case 'subjects': return renderSubjects(state);
    case 'map': return renderMap(state, context);
    case 'insights': return renderInsights(state);
    case 'settings': return renderSettings(state, durableStorage);
    default: return renderDashboard(state);
  }
}
