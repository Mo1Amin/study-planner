import './styles.css';
import { addDays, dateKey, formatDuration, minutesBetween } from './domain/date.js';
import { createPlannerStore, validateBackup } from './data/planner-store.js';
import { generateStudyPlan } from './domain/planning.js';
import { renderView } from './ui/views.js';
import { daffaLogo, escapeHtml, icon } from './ui/primitives.js';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'الرئيسية', icon: 'home' },
  { id: 'week', label: 'جدولي', icon: 'calendar' },
  { id: 'tasks', label: 'المهام', icon: 'check' },
  { id: 'subjects', label: 'المواد', icon: 'book' },
  { id: 'map', label: 'الخريطة', icon: 'route' },
  { id: 'insights', label: 'التقدم', icon: 'chart' },
  { id: 'settings', label: 'الإعدادات', icon: 'settings' },
];

const ROUTE_TITLES = Object.fromEntries(NAV_ITEMS.map((item) => [item.id, item.label]));
const store = await createPlannerStore();
let state = await store.load();
let durableStorage = store.isDurable();
let currentView = 'dashboard';
let mapContext = { connectMode: false, connectFrom: '' };
let viewContext = { viewOffset: 0, calendarMode: 'week', selectedDate: dateKey(), taskFilter: 'all', ...mapContext };
let activeDrag = null;

const app = document.getElementById('app');
const toastRegion = document.getElementById('toast-region');
const importInput = document.getElementById('import-file');

function makeId(prefix = 'item') {
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

function navButton(item, mobile = false) {
  const active = currentView === item.id;
  return `<button class="nav-link ${active ? 'is-active' : ''} ${mobile ? 'nav-link--mobile' : ''}" type="button" data-action="navigate" data-view="${item.id}" ${active ? 'aria-current="page"' : ''}>${icon(item.icon, 18)}<span>${item.label}</span>${item.id === 'tasks' && state.tasks.some((task) => !task.completed) ? `<small>${state.tasks.filter((task) => !task.completed).length}</small>` : ''}</button>`;
}

function timerElapsedMs(timer = state.timer) {
  if (!timer) return 0;
  return (Number(timer.elapsedMs) || 0) + (timer.running && timer.startedAt ? Math.max(0, Date.now() - timer.startedAt) : 0);
}

function formatClock(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function timerDock() {
  const timer = state.timer;
  if (!timer) return '';
  const event = state.events.find((item) => item.id === timer.eventId);
  if (!event) return '';
  const subject = state.subjects.find((item) => item.id === event.subjectId);
  return `<section class="timer-dock" aria-label="جلسة التركيز الحالية"><span class="timer-dock__pulse ${timer.running ? 'is-running' : ''}"></span><div class="timer-dock__label"><strong>${escapeHtml(event.title)}</strong><small>${escapeHtml(subject?.name || 'جلسة تركيز')} · ${timer.running ? 'الجلسة تعمل' : 'موقوفة مؤقتًا'}</small></div><strong class="timer-dock__clock" id="timer-clock">${formatClock(timerElapsedMs())}</strong>
    ${timer.running ? `<button type="button" class="button button--quiet" data-action="pause-timer" aria-label="أوقف الجلسة مؤقتًا">${icon('pause', 14)}<span>استراحة</span></button>` : `<button type="button" class="button button--quiet" data-action="resume-timer" aria-label="استكمل جلسة التركيز">${icon('play', 14)}<span>استكمل</span></button>`}<button type="button" class="button button--success" data-action="finish-timer" aria-label="سجّل انتهاء جلسة التركيز">${icon('check', 14)}<span>سجّل الجلسة</span></button>
  </section>`;
}

function render() {
  document.documentElement.dataset.theme = state.settings.theme === 'dark' ? 'dark' : 'light';
  const nav = NAV_ITEMS.map((item) => navButton(item)).join('');
  const mobileNav = NAV_ITEMS.filter((item) => ['dashboard', 'week', 'tasks', 'map'].includes(item.id)).map((item) => navButton(item, true)).join('');
  const view = renderView(currentView, state, viewContext, durableStorage);
  const savedAt = state.updatedAt ? new Date(state.updatedAt) : null;
  const saveLabel = savedAt ? `حُفظت بياناتك ${new Intl.DateTimeFormat('ar-EG', { hour: 'numeric', minute: '2-digit' }).format(savedAt)}` : 'حفظ تلقائي على هذا الجهاز';

  app.innerHTML = `<div class="app-shell">
    <aside class="sidebar" aria-label="التنقل الرئيسي"><div class="brand"><span class="brand__mark">${daffaLogo(31, 'daffa-logo--on-mark')}</span><span class="brand__word">دَفّة</span><small>خطّط يومك بوضوح</small></div>
      <p class="sidebar-label">مساحتي</p><nav class="primary-nav">${nav}</nav>
      <div class="sidebar-bottom"><div class="local-profile"><span class="profile-avatar">م</span><span><strong>مساحة شخصية</strong><small>خصوصيتك أولوية</small></span><span class="secure-dot" title="حفظ محلي"></span></div><div class="save-caption"><i class="${durableStorage ? 'is-saved' : 'is-fallback'}"></i>${saveLabel}</div></div>
    </aside>
    <div class="app-main"><header class="topbar"><div class="topbar__identity"><span class="mobile-brand__mark">${daffaLogo(25, 'daffa-logo--on-mark')}</span><div><p>${escapeHtml(ROUTE_TITLES[currentView] || 'دَفّة')}</p><span>خطّط بهدوء، وراجع تقدمك</span></div></div><div class="topbar__actions"><span class="today-chip">${new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short' }).format(new Date())}</span><button class="icon-button theme-button" type="button" data-action="toggle-theme" aria-label="${state.settings.theme === 'dark' ? 'تفعيل المظهر الفاتح' : 'تفعيل المظهر الداكن'}">${icon(state.settings.theme === 'dark' ? 'sun' : 'moon', 17)}</button><button class="button button--quiet backup-shortcut" type="button" data-action="navigate" data-view="settings" aria-label="النسخ الاحتياطي والاستعادة">${icon('download', 15)}<span>نسختي</span></button></div></header>
      <main id="main-content" class="page-content" tabindex="-1">${view}</main>
    </div>
    <nav class="mobile-nav" aria-label="التنقل للهاتف">${mobileNav}</nav>
    ${timerDock()}
    <footer class="app-footer"><span>دَفّة</span><span>وقتك لك، وبياناتك على جهازك.</span></footer>
  </div>`;
  app.setAttribute('aria-busy', 'false');
  if (currentView === 'map') bindDragEvents();
}

function toast(message, kind = 'success') {
  toastRegion.innerHTML = `<div class="toast toast--${kind}">${icon(kind === 'error' ? 'alert' : 'check', 16)}<span>${escapeHtml(message)}</span></div>`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { toastRegion.innerHTML = ''; }, 3600);
}

async function saveAndRender(nextState, message) {
  const result = await store.save(nextState);
  state = result.state;
  durableStorage = result.durableStorage;
  render();
  if (result.error) toast('تعذر حفظ البيانات على هذا الجهاز. نزّل نسخة احتياطية قبل متابعة التغييرات.', 'error');
  else if (message) toast(message);
  return result;
}

function setView(view) {
  if (view === 'week' && currentView !== 'week') {
    viewContext.viewOffset = 0;
    viewContext.calendarMode = 'week';
    viewContext.selectedDate = dateKey();
  }
  currentView = view;
  if (view !== 'map') mapContext = { connectMode: false, connectFrom: '' };
  viewContext = { ...viewContext, ...mapContext };
  render();
  document.getElementById('main-content')?.focus({ preventScroll: true });
}

function buttonElement(target) {
  return target.closest('button[data-action]');
}

function findFormData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function labelForNode(nodeId) {
  const [kind, id] = nodeId.split(':');
  if (kind === 'subject') return state.subjects.find((item) => item.id === id)?.name || 'مادة';
  if (kind === 'task') return state.tasks.find((item) => item.id === id)?.title || 'مهمة';
  return state.ideas.find((item) => item.id === id)?.title || 'فكرة';
}

function nodeExists(nodeId) {
  const [kind, id] = nodeId.split(':');
  return kind === 'subject' ? state.subjects.some((item) => item.id === id)
    : kind === 'task' ? state.tasks.some((item) => item.id === id && (!item.completed || state.links.some((link) => link.from === nodeId || link.to === nodeId)))
      : kind === 'idea' && state.ideas.some((item) => item.id === id);
}

function eventForQuickFocus() {
  const openTask = [...state.tasks].filter((task) => !task.completed).sort((left, right) => (left.dueDate || '').localeCompare(right.dueDate || ''))[0];
  const subjectId = openTask?.subjectId || state.subjects[0]?.id || null;
  const start = new Date();
  start.setMinutes(Math.ceil((start.getMinutes() + 2) / 10) * 10, 0, 0);
  if (start.getDate() !== new Date().getDate()) start.setTime(Date.now());
  const startTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
  return {
    id: makeId('focus'),
    title: openTask?.title || (subjectId ? `مذاكرة ${state.subjects.find((subject) => subject.id === subjectId)?.name}` : 'جلسة تركيز'),
    date: dateKey(),
    startTime,
    durationMinutes: Math.max(15, Number(state.settings.sessionMinutes) || 50),
    kind: 'study',
    status: 'planned',
    source: 'quick-focus',
    taskId: openTask?.id || null,
    subjectId,
  };
}

function elapsedTimer(timer) {
  return timerElapsedMs(timer);
}

async function handleClick(event) {
  const button = buttonElement(event.target);
  if (!button) return;
  const { action, id } = button.dataset;

  switch (action) {
    case 'navigate': setView(button.dataset.view); return;
    case 'open-task-form': {
      if (!state.subjects.length) {
        toast('أضف مادة واحدة قبل إنشاء أول مهمة.', 'error');
        setView('subjects');
        setTimeout(() => document.getElementById('subject-form-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
        return;
      }
      document.getElementById('task-form-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.querySelector('#task-form input[name="title"]')?.focus({ preventScroll: true });
      return;
    }
    case 'focus-subject-form':
      document.getElementById('subject-form-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.querySelector('#subject-form input[name="name"]')?.focus({ preventScroll: true });
      return;
    case 'open-idea-form':
      document.getElementById('idea-form-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.querySelector('#idea-form input[name="title"]')?.focus({ preventScroll: true });
      return;
    case 'open-event-form':
      document.getElementById('event-form-panel')?.setAttribute('open', '');
      document.getElementById('event-form-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.querySelector('#event-form input[name="title"]')?.focus({ preventScroll: true });
      return;
    case 'calendar-prev':
    case 'calendar-next': {
      const step = action === 'calendar-prev' ? -1 : 1;
      viewContext.viewOffset += step;
      if (viewContext.calendarMode === 'week') viewContext.selectedDate = addDays(viewContext.selectedDate, step * 7);
      else viewContext.selectedDate = dateKey(new Date(new Date().getFullYear(), new Date().getMonth() + viewContext.viewOffset, 1, 12));
      render();
      return;
    }
    case 'calendar-today':
      viewContext.viewOffset = 0;
      viewContext.selectedDate = dateKey();
      render();
      return;
    case 'calendar-mode':
      viewContext.calendarMode = button.dataset.mode;
      viewContext.viewOffset = 0;
      render();
      return;
    case 'set-selected-date':
      viewContext.selectedDate = button.dataset.date;
      render();
      return;
    case 'task-filter':
      viewContext.taskFilter = button.dataset.filter;
      render();
      return;
    case 'toggle-task': {
      const task = state.tasks.find((item) => item.id === id);
      if (!task) return;
      const completeNow = !task.completed;
      const activeEventId = state.timer?.eventId;
      const events = completeNow ? state.events.filter((item) => !(item.taskId === id && item.source === 'auto-plan' && item.status === 'planned' && item.id !== activeEventId)) : state.events;
      const removedSessions = state.events.length - events.length;
      await saveAndRender({ ...state, events, tasks: state.tasks.map((item) => item.id === id ? { ...item, completed: completeNow, completedAt: completeNow ? new Date().toISOString() : null } : item) }, task.completed ? 'عادت المهمة إلى قائمتك.' : removedSessions ? 'أُنجزت المهمة وأُزيلت جلساتها المستقبلية من الخطة.' : 'تم وضع علامة إنجاز.');
      return;
    }
    case 'edit-task': {
      const task = state.tasks.find((item) => item.id === id);
      const dialog = app.querySelector('#task-edit-dialog');
      const form = app.querySelector('#task-edit-form');
      if (!task || !dialog || !form) return;
      form.elements.namedItem('taskId').value = task.id;
      form.elements.namedItem('title').value = task.title;
      form.elements.namedItem('subjectId').value = task.subjectId || '';
      form.elements.namedItem('dueDate').value = task.dueDate || dateKey();
      form.elements.namedItem('priority').value = task.priority || 'medium';
      form.elements.namedItem('estimatedMinutes').value = task.estimatedMinutes || state.settings.sessionMinutes;
      form.elements.namedItem('note').value = task.note || '';
      dialog.showModal();
      form.elements.namedItem('title').focus();
      return;
    }
    case 'close-task-edit':
      app.querySelector('#task-edit-dialog')?.close();
      return;
    case 'delete-task': {
      const task = state.tasks.find((item) => item.id === id);
      if (!task || !window.confirm(`حذف المهمة «${task.title}»؟`)) return;
      const next = { ...state, tasks: state.tasks.filter((item) => item.id !== id), events: state.events.filter((item) => item.taskId !== id), links: state.links.filter((link) => link.from !== `task:${id}` && link.to !== `task:${id}`) };
      if (next.timer && state.events.find((item) => item.id === next.timer.eventId)?.taskId === id) next.timer = null;
      await saveAndRender(next, 'تم حذف المهمة وجلساتها المرتبطة.');
      return;
    }
    case 'delete-subject': {
      const subject = state.subjects.find((item) => item.id === id);
      if (!subject || !window.confirm(`حذف مادة «${subject.name}»؟ ستظل المهام والجلسات محفوظة من غير مادة.`)) return;
      const nodeId = `subject:${id}`;
      await saveAndRender({
        ...state,
        subjects: state.subjects.filter((item) => item.id !== id),
        tasks: state.tasks.map((task) => task.subjectId === id ? { ...task, subjectId: null } : task),
        events: state.events.map((item) => item.subjectId === id ? { ...item, subjectId: null } : item),
        links: state.links.filter((link) => link.from !== nodeId && link.to !== nodeId),
      }, 'حُذفت المادة، والمهام والجلسات محفوظة.');
      return;
    }
    case 'delete-event': {
      const found = state.events.find((item) => item.id === id);
      if (!found || !window.confirm(`حذف «${found.title}» من الجدول؟`)) return;
      await saveAndRender({ ...state, events: state.events.filter((item) => item.id !== id), timer: state.timer?.eventId === id ? null : state.timer }, 'تم حذف النشاط.');
      return;
    }
    case 'complete-event': {
      const item = state.events.find((entry) => entry.id === id);
      if (!item) return;
      const trackedMinutes = state.timer?.eventId === id ? Math.max(1, Math.round(timerElapsedMs() / 60000)) : item.durationMinutes;
      await saveAndRender({ ...state, timer: state.timer?.eventId === id ? null : state.timer, events: state.events.map((entry) => entry.id === id ? { ...entry, status: 'completed', actualMinutes: entry.actualMinutes || trackedMinutes, completedAt: new Date().toISOString() } : entry) }, 'تم تسجيل وقت الجلسة.');
      return;
    }
    case 'generate-plan': {
      const result = generateStudyPlan(state);
      if (!result.events.length && !result.unplanned.length) {
        toast('كل مهامك لها وقت، أو لا توجد مهام مفتوحة.', 'error');
        return;
      }
      viewContext.selectedDate = dateKey();
      const next = { ...state, events: [...state.events, ...result.events] };
      await saveAndRender(next, result.unplanned.length ? `أُضيفت ${result.events.length} جلسات. راجع ${result.unplanned.length} مهام تجاوزت الوقت المتاح.` : `وُزعت ${result.events.length} جلسات على وقتك المتاح.`);
      return;
    }
    case 'start-quick-focus': {
      const focusEvent = eventForQuickFocus();
      await saveAndRender({ ...state, events: [...state.events, focusEvent], timer: { eventId: focusEvent.id, running: true, startedAt: Date.now(), elapsedMs: 0 } }, 'بدأت جلسة التركيز. أوقفها وسجّل الوقت عند الانتهاء.');
      return;
    }
    case 'start-timer':
    case 'resume-timer': {
      const currentEvent = state.events.find((item) => item.id === (id || state.timer?.eventId));
      if (!currentEvent) return;
      if (state.timer && state.timer.eventId !== currentEvent.id && !window.confirm('هناك جلسة جارية. بدء هذه الجلسة سيتوقف عن تتبع الجلسة السابقة.')) return;
      let events = state.events;
      if (state.timer && state.timer.eventId !== currentEvent.id) {
        const previousElapsed = timerElapsedMs();
        events = events.map((item) => item.id === state.timer.eventId ? {
          ...item,
          status: 'completed',
          actualMinutes: Math.max(1, Math.round(previousElapsed / 60000)),
          completedAt: new Date().toISOString(),
        } : item);
      }
      await saveAndRender({ ...state, events, timer: { eventId: currentEvent.id, running: true, startedAt: Date.now(), elapsedMs: state.timer?.eventId === currentEvent.id ? timerElapsedMs() : 0 } }, 'بدأ عدّاد الجلسة.');
      return;
    }
    case 'pause-timer': {
      if (!state.timer?.running) return;
      await saveAndRender({ ...state, timer: { ...state.timer, running: false, startedAt: null, elapsedMs: timerElapsedMs() } }, 'توقّف العداد مؤقتًا.');
      return;
    }
    case 'finish-timer': {
      if (!state.timer) return;
      const elapsed = elapsedTimer(state.timer);
      const item = state.events.find((entry) => entry.id === state.timer.eventId);
      if (!item) { await saveAndRender({ ...state, timer: null }); return; }
      await saveAndRender({ ...state, timer: null, events: state.events.map((entry) => entry.id === item.id ? { ...entry, status: 'completed', actualMinutes: Math.max(1, Math.round(elapsed / 60000)), completedAt: new Date().toISOString() } : entry) }, `سُجلت ${formatDuration(Math.max(1, Math.round(elapsed / 60000)))} مذاكرة.`);
      return;
    }
    case 'toggle-theme':
      await saveAndRender({ ...state, settings: { ...state.settings, theme: state.settings.theme === 'dark' ? 'light' : 'dark' } });
      return;
    case 'connect-mode':
      mapContext = { connectMode: !mapContext.connectMode, connectFrom: '' };
      viewContext = { ...viewContext, ...mapContext };
      render();
      return;
    case 'map-node': {
      if (!mapContext.connectMode) return;
      const nodeId = button.dataset.node;
      if (!nodeExists(nodeId)) return;
      if (!mapContext.connectFrom) {
        mapContext.connectFrom = nodeId;
        viewContext = { ...viewContext, ...mapContext };
        render();
        return;
      }
      if (mapContext.connectFrom === nodeId) {
        toast('اختَر عنصرًا آخر لإنشاء الرابط.', 'error');
        return;
      }
      const duplicate = state.links.some((link) => link.from === mapContext.connectFrom && link.to === nodeId);
      const connection = { id: makeId('link'), from: mapContext.connectFrom, to: nodeId, fromLabel: labelForNode(mapContext.connectFrom), toLabel: labelForNode(nodeId) };
      mapContext = { connectMode: false, connectFrom: '' };
      viewContext = { ...viewContext, ...mapContext };
      if (!duplicate) await saveAndRender({ ...state, links: [...state.links, connection] }, 'أُضيف سهم يوضح العلاقة.');
      else { render(); toast('العلاقة موجودة بالفعل.', 'error'); }
      return;
    }
    case 'delete-link':
      await saveAndRender({ ...state, links: state.links.filter((link) => link.id !== id) }, 'تمت إزالة العلاقة.');
      return;
    case 'export-data':
      downloadBackup();
      return;
    case 'import-data':
      importInput.click();
      return;
    case 'reset-data':
      if (window.confirm('مسح المواد والمهام والجلسات والروابط من هذا الجهاز؟ نزّل نسخة احتياطية أولًا إذا أردت الاحتفاظ بها.')) {
        const reset = { ...state, subjects: [], tasks: [], events: [], ideas: [], links: [], mapPositions: {}, timer: null };
        await saveAndRender(reset, 'أصبحت المساحة فارغة وجاهزة من جديد.');
      }
      return;
    case 'load-demo':
      if (state.subjects.length || state.tasks.length || state.events.length) {
        toast('المثال متاح في مساحة فارغة فقط؛ صدّر نسختك قبل إعادة الضبط.', 'error');
        return;
      }
      await saveAndRender(makeDemoState(), 'أُضيفت بيانات توضيحية. يمكنك حذفها في أي وقت.');
      return;
  }
}

function downloadBackup() {
  const backup = { ...state, exportedAt: new Date().toISOString(), app: 'Daffa' };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `daffa-backup-${dateKey()}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('تم تنزيل نسخة بياناتك. احتفظ بها في مكان آمن.');
}

function makeDemoState() {
  const anatomyId = makeId('subject');
  const physiologyId = makeId('subject');
  const anatomyTaskId = makeId('task');
  const physiologyTaskId = makeId('task');
  const today = dateKey();
  return {
    ...state,
    subjects: [
      { id: anatomyId, name: 'التشريح', note: 'الأطراف العلوية · مراجعة على دفعات', color: '#3f766c', weeklyGoalMinutes: 300 },
      { id: physiologyId, name: 'علم وظائف الأعضاء', note: 'الفهم أولًا ثم استرجاع نشط', color: '#527398', weeklyGoalMinutes: 240 },
    ],
    tasks: [
      { id: anatomyTaskId, title: 'رسم مسار الضفيرة العضدية', subjectId: anatomyId, dueDate: addDays(today, 2), priority: 'high', estimatedMinutes: 100, note: 'ارسم الفروع من الذاكرة', completed: false },
      { id: physiologyTaskId, title: 'مراجعة تنظيم ضغط الدم', subjectId: physiologyId, dueDate: addDays(today, 4), priority: 'medium', estimatedMinutes: 75, note: 'اربط المستقبلات بالاستجابة', completed: false },
    ],
    events: [
      { id: makeId('event'), title: 'استرجاع نشط: عضلات الكتف', date: addDays(today, -1), startTime: '17:00', durationMinutes: 50, kind: 'study', status: 'completed', actualMinutes: 45, taskId: anatomyTaskId, subjectId: anatomyId, source: 'demo' },
      { id: makeId('event'), title: 'محاضرة فسيولوجيا', date: addDays(today, 1), startTime: '12:00', durationMinutes: 60, kind: 'appointment', status: 'planned', subjectId: physiologyId, source: 'demo' },
    ],
    ideas: [{ id: makeId('idea'), title: 'المدخلات الحسية', note: 'اربطها بمسارات الحركة' }],
    links: [],
  };
}

async function handleSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  const formId = form.getAttribute('id');
  if (!['task-edit-form', 'subject-form', 'task-form', 'event-form', 'idea-form', 'settings-form'].includes(formId)) return;
  event.preventDefault();
  const data = findFormData(form);

  if (formId === 'task-edit-form') {
    const existing = state.tasks.find((task) => task.id === data.taskId);
    if (!existing) { toast('لم تعد هذه المهمة موجودة.', 'error'); return; }
    const updated = {
      ...existing,
      title: data.title.trim(),
      subjectId: state.subjects.some((subject) => subject.id === data.subjectId) ? data.subjectId : null,
      dueDate: data.dueDate,
      priority: data.priority,
      estimatedMinutes: Math.max(15, Math.min(600, Number(data.estimatedMinutes) || 50)),
      note: data.note.trim(),
    };
    const planChanged = ['title', 'subjectId', 'dueDate', 'priority', 'estimatedMinutes'].some((key) => updated[key] !== existing[key]);
    const activeEventId = state.timer?.eventId;
    const events = planChanged
      ? state.events.filter((item) => !(item.taskId === existing.id && item.source === 'auto-plan' && item.status === 'planned' && item.id !== activeEventId)).map((item) => item.id === activeEventId && item.taskId === existing.id ? { ...item, title: updated.title, subjectId: updated.subjectId } : item)
      : state.events;
    const removedSessions = state.events.length - events.length;
    const taskNodeId = `task:${existing.id}`;
    const links = state.links.map((link) => ({
      ...link,
      fromLabel: link.from === taskNodeId ? updated.title : link.fromLabel,
      toLabel: link.to === taskNodeId ? updated.title : link.toLabel,
    }));
    app.querySelector('#task-edit-dialog')?.close();
    await saveAndRender({ ...state, events, tasks: state.tasks.map((task) => task.id === existing.id ? updated : task), links }, removedSessions ? 'تم تعديل المهمة. أعد إنشاء الخطة لتحديث جلساتها.' : 'تم تحديث المهمة.');
    return;
  }

  if (formId === 'subject-form') {
    const name = data.name.trim();
    if (!name) return;
    if (state.subjects.some((subject) => subject.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) {
      toast('هذه المادة موجودة بالفعل.', 'error');
      return;
    }
    const palette = ['#3f766c', '#527398', '#ad7046', '#8271a1', '#7a8a4b', '#bd665d'];
    const subject = { id: makeId('subject'), name, note: data.note.trim(), color: palette[state.subjects.length % palette.length], weeklyGoalMinutes: Number(data.weeklyGoalMinutes) || 300 };
    form.reset();
    await saveAndRender({ ...state, subjects: [...state.subjects, subject] }, 'أُضيفت المادة إلى مساحتك.');
    return;
  }

  if (formId === 'task-form') {
    const task = {
      id: makeId('task'),
      title: data.title.trim(),
      subjectId: data.subjectId || null,
      dueDate: data.dueDate,
      priority: data.priority,
      estimatedMinutes: Math.max(15, Number(data.estimatedMinutes) || 50),
      note: (data.note || '').trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    form.reset();
    await saveAndRender({ ...state, tasks: [...state.tasks, task] }, 'اتسجلت المهمة وأصبحت جاهزة للتخطيط.');
    return;
  }

  if (formId === 'event-form') {
    const kind = data.kind;
    const relatedTask = state.tasks.find((task) => task.id === data.taskId);
    const startMinutes = Number(data.startTime.split(':')[0]) * 60 + Number(data.startTime.split(':')[1]);
    const durationMinutes = Math.max(15, Number(data.durationMinutes) || 50);
    const dayStart = Number(state.settings.studyStart.split(':')[0]) * 60 + Number(state.settings.studyStart.split(':')[1]);
    const dayEnd = Number(state.settings.studyEnd.split(':')[0]) * 60 + Number(state.settings.studyEnd.split(':')[1]);
    if (kind === 'study' && (startMinutes < dayStart || startMinutes + durationMinutes > dayEnd)) {
      toast('الجلسة خارج وقت الدراسة الذي حددته. غيّر الوقت أو عدّل الإعدادات.', 'error');
      return;
    }
    const conflict = state.events.some((item) => item.date === data.date && item.status !== 'cancelled' && startMinutes < (Number(item.startTime.slice(0, 2)) * 60 + Number(item.startTime.slice(3)) + Number(item.durationMinutes)) && startMinutes + durationMinutes > (Number(item.startTime.slice(0, 2)) * 60 + Number(item.startTime.slice(3))));
    if (conflict && !window.confirm('يوجد نشاط آخر في هذا الوقت. هل تريد إضافة الموعد رغم ذلك؟')) return;
    const item = {
      id: makeId('event'), title: data.title.trim(), date: data.date, startTime: data.startTime, durationMinutes,
      kind, status: 'planned', source: 'manual', subjectId: relatedTask?.subjectId || data.subjectId || null, taskId: data.taskId || null,
    };
    form.reset();
    await saveAndRender({ ...state, events: [...state.events, item] }, 'أُضيف النشاط إلى الجدول.');
    return;
  }

  if (formId === 'idea-form') {
    const idea = { id: makeId('idea'), title: data.title.trim(), note: (data.note || '').trim() };
    form.reset();
    await saveAndRender({ ...state, ideas: [...state.ideas, idea] }, 'أُضيفت الفكرة إلى الخريطة.');
    return;
  }

  if (formId === 'settings-form') {
    const start = data.studyStart;
    const end = data.studyEnd;
    if (minutesBetween(start, end) < 60) {
      toast('حدد فترة دراسة لا تقل عن ساعة واحدة.', 'error');
      return;
    }
    const settings = {
      ...state.settings,
      dailyGoalMinutes: Math.max(30, Number(data.dailyGoalMinutes) || 180),
      sessionMinutes: Math.max(15, Number(data.sessionMinutes) || 50),
      breakMinutes: Math.max(0, Number(data.breakMinutes) || 0),
      studyStart: start,
      studyEnd: end,
    };
    await saveAndRender({ ...state, settings }, 'تم تحديث إيقاع دراستك.');
  }
}

async function handleImport() {
  const [file] = importInput.files || [];
  if (!file) return;
  try {
    const imported = validateBackup(JSON.parse(await file.text()));
    if (!window.confirm(`استبدال البيانات الحالية بـ${imported.subjects.length} مواد و${imported.tasks.length} مهام من النسخة؟`)) return;
    await saveAndRender(imported, 'استُعيدت النسخة بنجاح.');
  } catch (error) {
    toast(error instanceof Error ? error.message : 'تعذرت قراءة الملف.', 'error');
  } finally {
    importInput.value = '';
  }
}

function positionMapPaths() {
  const board = document.getElementById('map-board');
  if (!board) return;
  for (const path of board.querySelectorAll('.map-connection')) {
    const fromElement = board.querySelector(`[data-node="${CSS.escape(path.dataset.from || '')}"]`);
    const toElement = board.querySelector(`[data-node="${CSS.escape(path.dataset.to || '')}"]`);
    if (!fromElement || !toElement) continue;
    const from = { x: parseFloat(fromElement.style.left), y: parseFloat(fromElement.style.top) };
    const to = { x: parseFloat(toElement.style.left), y: parseFloat(toElement.style.top) };
    const middle = (from.x + to.x) / 2;
    path.setAttribute('d', `M ${from.x} ${from.y} C ${middle} ${from.y}, ${middle} ${to.y}, ${to.x} ${to.y}`);
  }
}

function mapPointFromEvent(event, node) {
  const board = document.getElementById('map-board');
  if (!board || !node) return null;
  const rect = board.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return {
    x: Math.max(10, Math.min(90, (event.clientX - rect.left) / rect.width * 100)),
    y: Math.max(12, Math.min(88, (event.clientY - rect.top) / rect.height * 100)),
  };
}

async function saveMapPosition(nodeId, position) {
  if (!position) return;
  state = { ...state, mapPositions: { ...state.mapPositions, [nodeId]: { x: position.x, y: position.y } } };
  await saveAndRender(state);
}

function bindDragEvents() {
  app.querySelectorAll('.map-node').forEach((node) => {
    node.addEventListener('pointerdown', (event) => {
      if (mapContext.connectMode || event.button !== 0) return;
      event.preventDefault();
      activeDrag = { nodeId: node.dataset.node, element: node, pointerId: event.pointerId };
      node.classList.add('is-dragging');
      node.setPointerCapture(event.pointerId);
    });
    node.addEventListener('pointermove', (event) => {
      if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
      const position = mapPointFromEvent(event, node);
      if (!position) return;
      node.style.left = `${position.x}%`;
      node.style.top = `${position.y}%`;
      state.mapPositions = { ...state.mapPositions, [activeDrag.nodeId]: position };
      positionMapPaths();
    });
    node.addEventListener('pointerup', async (event) => {
      if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
      const current = activeDrag;
      const position = mapPointFromEvent(event, node);
      node.classList.remove('is-dragging');
      activeDrag = null;
      if (position) await saveMapPosition(current.nodeId, position);
    });
    node.addEventListener('keydown', async (event) => {
      const steps = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] };
      const delta = steps[event.key];
      if (!delta) return;
      event.preventDefault();
      const currentX = parseFloat(node.style.left);
      const currentY = parseFloat(node.style.top);
      const position = { x: Math.max(10, Math.min(90, currentX + delta[0])), y: Math.max(12, Math.min(88, currentY + delta[1])) };
      node.style.left = `${position.x}%`;
      node.style.top = `${position.y}%`;
      state.mapPositions = { ...state.mapPositions, [node.dataset.node]: position };
      positionMapPaths();
      const nodeId = node.dataset.node;
      await saveMapPosition(nodeId, position);
      app.querySelector(`[data-node="${CSS.escape(nodeId)}"]`)?.focus({ preventScroll: true });
    });
  });
}

app.addEventListener('click', handleClick);
app.addEventListener('submit', handleSubmit);
importInput.addEventListener('change', handleImport);
app.addEventListener('change', (event) => {
  if (event.target.matches('#event-form select[name="taskId"]')) {
    const task = state.tasks.find((item) => item.id === event.target.value);
    const subjectSelect = app.querySelector('#event-form select[name="subjectId"]');
    if (task && subjectSelect) subjectSelect.value = task.subjectId || '';
  }
});

setInterval(() => {
  const clock = document.getElementById('timer-clock');
  if (clock && state.timer) clock.textContent = formatClock(timerElapsedMs());
}, 1000);

window.addEventListener('focus', () => {
  if (state.timer?.running) {
    const clock = document.getElementById('timer-clock');
    if (clock) clock.textContent = formatClock(timerElapsedMs());
  }
});

window.addEventListener('storage', (event) => {
  if (!event.key?.startsWith('munazzami.')) return;
  store.load().then((stored) => { state = stored; render(); });
});

render();
