const DATABASE_NAME = 'munazzami-planner';
const DATABASE_VERSION = 1;
const RECORD_KEY = 'workspace';
const FALLBACK_KEY = 'munazzami.workspace.v2';

export function createEmptyState() {
  return {
    schemaVersion: 2,
    subjects: [],
    tasks: [],
    events: [],
    ideas: [],
    links: [],
    mapPositions: {},
    timer: null,
    settings: {
      theme: 'light',
      dailyGoalMinutes: 180,
      sessionMinutes: 50,
      breakMinutes: 10,
      studyStart: '16:00',
      studyEnd: '22:00',
    },
    updatedAt: new Date().toISOString(),
  };
}

function normalizeState(input) {
  const empty = createEmptyState();
  if (!input || typeof input !== 'object' || Array.isArray(input)) return empty;

  const settings = input.settings && typeof input.settings === 'object' ? input.settings : {};
  return {
    ...empty,
    ...input,
    schemaVersion: 2,
    subjects: Array.isArray(input.subjects) ? input.subjects : [],
    tasks: Array.isArray(input.tasks) ? input.tasks : [],
    events: Array.isArray(input.events) ? input.events : [],
    ideas: Array.isArray(input.ideas) ? input.ideas : [],
    links: Array.isArray(input.links) ? input.links : [],
    mapPositions: input.mapPositions && typeof input.mapPositions === 'object' ? input.mapPositions : {},
    timer: input.timer && typeof input.timer === 'object' ? input.timer : null,
    settings: { ...empty.settings, ...settings },
  };
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('state')) database.createObjectStore('state');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local storage'));
    request.onblocked = () => reject(new Error('Local storage upgrade is blocked'));
  });
}

async function readIndexedRecord(database) {
  return new Promise((resolve, reject) => {
    const request = database.transaction('state', 'readonly').objectStore('state').get(RECORD_KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not read local storage'));
  });
}

async function writeIndexedRecord(database, value) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('state', 'readwrite');
    transaction.objectStore('state').put(value, RECORD_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save locally'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Local save was interrupted'));
  });
}

export async function createPlannerStore() {
  let database = null;
  let durableStorage = true;

  try {
    database = await openDatabase();
  } catch {
    durableStorage = false;
  }

  function readFallback() {
    try {
      const saved = localStorage.getItem(FALLBACK_KEY);
      if (saved) return normalizeState(JSON.parse(saved));

      // Carry forward the preferences kept by the original static planner.
      const legacy = createEmptyState();
      const legacyMode = localStorage.getItem('darkMode');
      const legacySessionLength = Number(localStorage.getItem('studySessionLength'));
      const legacyBreakValue = localStorage.getItem('breakLength');
      const legacyBreakLength = Number(legacyBreakValue);
      legacy.settings = {
        ...legacy.settings,
        theme: legacyMode === 'dark' ? 'dark' : 'light',
        sessionMinutes: legacySessionLength >= 15 && legacySessionLength <= 180 ? legacySessionLength : legacy.settings.sessionMinutes,
        breakMinutes: legacyBreakValue !== null && legacyBreakLength >= 0 && legacyBreakLength <= 30 ? legacyBreakLength : legacy.settings.breakMinutes,
      };
      return legacy;
    } catch {
      return createEmptyState();
    }
  }

  async function load() {
    if (database) {
      try {
        const stored = await readIndexedRecord(database);
        if (stored) return normalizeState(stored);
        const migrated = readFallback();
        await writeIndexedRecord(database, migrated);
        return migrated;
      } catch {
        durableStorage = false;
      }
    }
    return readFallback();
  }

  async function save(state) {
    const value = normalizeState({ ...state, updatedAt: new Date().toISOString() });
    if (database && durableStorage) {
      try {
        await writeIndexedRecord(database, value);
        return { state: value, durableStorage: true };
      } catch {
        durableStorage = false;
      }
    }

    try {
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(value));
      return { state: value, durableStorage: false };
    } catch (error) {
      return { state: value, durableStorage: false, error };
    }
  }

  return { load, save, isDurable: () => durableStorage };
}

export function validateBackup(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('ملف النسخة غير صالح.');
  if (data.schemaVersion !== 2) throw new Error('إصدار النسخة غير متوافق.');
  for (const key of ['subjects', 'tasks', 'events', 'ideas', 'links']) {
    if (!Array.isArray(data[key])) throw new Error('بعض قوائم النسخة غير مكتملة.');
  }
  return normalizeState(data);
}
