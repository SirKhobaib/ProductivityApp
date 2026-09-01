'use strict';

/* Persistence + domain logic.
   Shape (schemaVersion 1) — flat JSON so cloud sync can layer on later:
   {
     schemaVersion, createdAt, updatedAt,
     habits: [{ id, name, unit, customUnit, target, icon, color, category,
                subtasks: [{id,title}], archived, createdAt, updatedAt, sortOrder }],
     days: { "YYYY-MM-DD": { habits: { [habitId]: { v, note, st:{[subId]:true}, updatedAt } },
                             tasks: [{id,title,done,createdAt}], celebrated } },
     periods: { weeks: { "YYYY-Wnn": { tasks:[...] } },
                months: { "YYYY-MM": { tasks:[...] } } },
     meta: { seeded: true }
   } */
const STORE_KEY = 'habittrack.v1';
const UNITS = ['pages', 'times', 'minutes', 'hours', 'custom'];
const DEFAULT_CATS = ['Spiritual', 'Mind', 'Body', 'Work', 'Discipline', 'Important', 'Priority'];
const PALETTE = ['#58CC02', '#1CB0F6', '#5B5F6E'];
// One-time remap of the v1 rainbow palette onto the 3-color system.
const OLD_COLOR_MAP = { '#CE82FF': '#1CB0F6', '#FF9600': '#58CC02', '#FFC800': '#58CC02', '#FF86D0': '#1CB0F6', '#FF4B4B': '#5B5F6E' };
const ICONS = ['\u{1F4D6}', '\u{1F9D8}', '\u{1F4AA}', '\u{1F3C3}', '\u{1F4BB}', '\u270D\uFE0F', '\u{1F4A7}', '\u{1F305}', '\u{1F3AF}', '\u{1F4DA}', '\u{1F3B8}', '\u{1F9F9}', '\u{1F48A}', '\u{1F957}', '\u{1F634}', '\u{1F64F}'];

const Store = (() => {
  let db = null;
  const nowIso = () => new Date().toISOString();

  function persist() {
    db.updatedAt = nowIso();
    try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); }
    catch (e) { U.toast('Storage unavailable - changes may not persist'); }
  }

  // Give pre-v4 tasks the new detail fields (doer/start/due/place/note),
  // and pre-v5 tasks the optional time-of-day fields (startTime/dueTime).
  function migrateTaskList(list) {
    (list || []).forEach((t) => {
      if (t.doer === undefined) t.doer = '';
      if (t.start === undefined) t.start = '';
      if (t.due === undefined) t.due = '';
      if (t.startTime === undefined) t.startTime = '';
      if (t.dueTime === undefined) t.dueTime = '';
      if (t.place === undefined) t.place = '';
      if (t.note === undefined) t.note = '';
    });
  }
  function migrateAllTasks() {
    for (const k of Object.keys(db.days)) migrateTaskList(db.days[k].tasks);
    for (const k of Object.keys(db.periods.weeks)) migrateTaskList(db.periods.weeks[k].tasks);
    for (const k of Object.keys(db.periods.months)) migrateTaskList(db.periods.months[k].tasks);
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.schemaVersion === 1 && parsed.meta && parsed.meta.seeded) {
          db = parsed;
          db.periods = db.periods || { weeks: {}, months: {} };
          db.profile = db.profile || {};
          db.settings = Object.assign({ goalPct: 80, cascadeTasks: true, theme: 'light', lang: 'en', calendar: 'iran', categories: [] }, db.settings || {});
          db.meta.milestones = db.meta.milestones || {};
          migrateAllTasks();
          if (!db.meta.onboarded && db.meta.tourDone) db.meta.onboarded = true;
          if (!db.meta.paletteV2) {
            db.habits.forEach((h) => { if (OLD_COLOR_MAP[h.color]) h.color = OLD_COLOR_MAP[h.color]; });
            db.meta.paletteV2 = true;
          }
        }
      }
    } catch (e) { db = null; }
    if (!db) seed();
  }

  function reset() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
    seed();
  }

  // Wipe everything and keep the app empty (seeded flag stays true so the
  // empty state is respected on reload instead of re-seeding samples).
  function eraseAll() {
    db = {
      schemaVersion: 1, createdAt: nowIso(), updatedAt: null,
      habits: [], days: {}, periods: { weeks: {}, months: {} },
      profile: {},
      settings: { goalPct: 80, cascadeTasks: true, theme: 'light', lang: 'en', calendar: 'iran', categories: [] },
      meta: { seeded: true, milestones: {}, paletteV2: true }
    };
    persist();
  }

  function loadSample() { seed(); }

  function seed() {
    db = {
      schemaVersion: 1, createdAt: nowIso(), updatedAt: null,
      habits: [], days: {}, periods: { weeks: {}, months: {} },
      profile: {},
      settings: { goalPct: 80, cascadeTasks: true, theme: 'light', lang: 'en', calendar: 'iran', categories: [] },
      meta: { seeded: false, milestones: {} }
    };
    seedSample();
    db.meta.seeded = true;
    persist();
  }

  /* ---------- habits ---------- */
  const habitById = (id) => db.habits.find((x) => x.id === id) || null;
  const activeHabits = () => db.habits.filter((h) => !h.archived).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  function addHabit(o) {
    const maxSort = db.habits.reduce((m, h) => Math.max(m, h.sortOrder || 0), 0);
    const habit = {
      id: U.uid('h'), name: o.name, unit: o.unit, customUnit: o.customUnit || '',
      target: Number(o.target) || 1, icon: o.icon || '\u{1F3AF}', color: o.color || PALETTE[0],
      category: o.category || 'Mind',
      subtasks: (o.subtasks || []).map((s) => ({ id: s.id || U.uid('s'), title: s.title })),
      archived: false, createdAt: nowIso(), updatedAt: nowIso(), sortOrder: maxSort + 1
    };
    db.habits.push(habit);
    persist();
    return habit;
  }

  function updateHabit(id, patch) {
    const h = habitById(id);
    if (!h) return null;
    Object.assign(h, patch, { updatedAt: nowIso() });
    persist();
    return h;
  }

  function archiveHabit(id) {
    const h = habitById(id);
    if (!h) return;
    h.archived = true;
    h.archivedAt = nowIso();
    h.updatedAt = nowIso();
    persist();
  }

  /* ---------- day records (created lazily on first write) ---------- */
  const peekDay = (key) => db.days[key] || null;
  const entryFor = (key, habitId) => { const d = peekDay(key); return (d && d.habits[habitId]) || null; };

  function ensureDay(key) {
    let d = db.days[key];
    if (!d) { d = { habits: {}, tasks: [], celebrated: false }; db.days[key] = d; }
    return d;
  }

  function ensureEntry(key, habitId) {
    const d = ensureDay(key);
    let e = d.habits[habitId];
    if (!e) { e = { v: 0, note: '', st: {}, updatedAt: null }; d.habits[habitId] = e; }
    return e;
  }

  const round2 = (n) => Math.round(n * 100) / 100;

  function setHabitValue(key, habitId, v) {
    const e = ensureEntry(key, habitId);
    e.v = Math.max(0, round2(v));
    e.updatedAt = nowIso();
    persist();
  }

  function completeHabitDay(key, habitId, target) {
    const e = ensureEntry(key, habitId);
    e.v = target;
    const h = habitById(habitId);
    if (h) h.subtasks.forEach((s) => { e.st[s.id] = true; });
    e.updatedAt = nowIso();
    persist();
  }

  function resetHabitDay(key, habitId) {
    const e = ensureEntry(key, habitId);
    e.v = 0;
    e.st = {};
    e.updatedAt = nowIso();
    persist();
  }

  function toggleSubtask(key, habitId, subId) {
    const e = ensureEntry(key, habitId);
    if (e.st[subId]) delete e.st[subId]; else e.st[subId] = true;
    e.updatedAt = nowIso();
    persist();
  }

  function setNote(key, habitId, note) {
    const e = ensureEntry(key, habitId);
    e.note = note;
    e.updatedAt = nowIso();
    persist();
  }

  /* ---------- tasks (daily in day record; weekly/monthly in period records) ---------- */
  const dailyTasks = (key) => { const d = peekDay(key); return d ? d.tasks : []; };
  const peekPeriodTasks = (kind, key) => {
    const bucket = kind === 'weekly' ? db.periods.weeks : db.periods.months;
    const b = bucket[key];
    return b ? b.tasks : [];
  };

  function taskList(kind, key) {
    if (kind === 'daily') return ensureDay(key).tasks;
    const bucket = kind === 'weekly' ? db.periods.weeks : db.periods.months;
    let b = bucket[key];
    if (!b) { b = { tasks: [] }; bucket[key] = b; }
    return b.tasks;
  }

  function addTask(kind, key, title, cat, extra) {
    const x = extra || {};
    const t = {
      id: U.uid('t'), title, cat: cat || null,
      doer: x.doer || '', start: x.start || '', due: x.due || '',
      startTime: x.startTime || '', dueTime: x.dueTime || '',
      place: x.place || '', note: x.note || '',
      done: false, createdAt: nowIso()
    };
    taskList(kind, key).push(t);
    persist();
    return t;
  }

  function findTask(kind, key, taskId) {
    const list = kind === 'daily' ? dailyTasks(key) : peekPeriodTasks(kind, key);
    return { list: list || [], t: list ? list.find((x) => x.id === taskId) || null : null };
  }

  function updateTask(kind, key, taskId, patch) {
    const f = findTask(kind, key, taskId);
    if (!f.t) return null;
    Object.assign(f.t, patch, { updatedAt: nowIso() });
    persist();
    return f.t;
  }

  function toggleTask(kind, key, taskId) {
    const f = findTask(kind, key, taskId);
    if (!f.t) return;
    f.t.done = !f.t.done;
    f.t.updatedAt = nowIso();
    persist();
  }

  function deleteTask(kind, key, taskId) {
    const list = taskList(kind, key);
    const i = list.findIndex((x) => x.id === taskId);
    if (i >= 0) { list.splice(i, 1); persist(); }
  }

  // Move a task up (-1) or down (+1) within its list (display order).
  function moveTask(kind, key, taskId, dir) {
    const f = findTask(kind, key, taskId);
    if (!f.t) return false;
    const i = f.list.indexOf(f.t);
    const j = i + (dir < 0 ? -1 : 1);
    if (j < 0 || j >= f.list.length) return false;
    f.list.splice(i, 1);
    f.list.splice(j, 0, f.t);
    persist();
    return true;
  }

  // Move a task to an absolute index within its list (drag reorder).
  function moveTaskTo(kind, key, taskId, toIndex) {
    const f = findTask(kind, key, taskId);
    if (!f.t) return false;
    const i = f.list.indexOf(f.t);
    const j = Math.max(0, Math.min(f.list.length - 1, toIndex));
    if (j === i) return false;
    f.list.splice(i, 1);
    f.list.splice(j, 0, f.t);
    persist();
    return true;
  }

  /* ---------- progress / stats ---------- */
  // A habit's share of completion: value ratio, blended 50/50 with subtask
  // ratio when the habit has subtasks. Capped at 100%.
  function habitRatio(h, e) {
    const val = e ? (e.v || 0) : 0;
    const vr = U.clamp(h.target > 0 ? val / h.target : 0, 0, 1);
    if (!h.subtasks || !h.subtasks.length) return vr;
    let done = 0;
    if (e && e.st) for (const s of h.subtasks) if (e.st[s.id]) done++;
    return (vr + done / h.subtasks.length) / 2;
  }

  // Effort weighting: each habit's pull on the day % is proportional to
  // target x effort-per-unit, so 4h of deep work outweighs 8 glasses of water.
  const UNIT_EFFORT = { pages: 2, times: 15, minutes: 1, hours: 60, custom: 2 };
  function unitEffort(unit) { return UNIT_EFFORT[unit] || 2; }
  function effortPerUnit(h) { return (h.effortMin && h.effortMin > 0) ? h.effortMin : unitEffort(h.unit); }
  function habitWeight(h) { return Math.max(1, (h.target || 1) * effortPerUnit(h)); }

  function dayStats(key) {
    const habits = activeHabits();
    const d = peekDay(key);
    const ratios = {};
    let wsum = 0, wearned = 0, doneCount = 0;
    for (const h of habits) {
      const r = habitRatio(h, d ? d.habits[h.id] : null);
      ratios[h.id] = r;
      const w = habitWeight(h);
      wsum += w;
      wearned += w * r;
      if (r >= 0.999) doneCount++;
    }
    // The habits block and the tasks block each contribute one unit of the
    // day score; inside the habits block, effort decides each habit's share.
    const habitsScore = wsum ? wearned / wsum : 0;
    const tasks = d ? d.tasks : [];
    const tDone = tasks.filter((t) => t.done).length;
    const tTotal = tasks.length;
    const parts = (habits.length ? 1 : 0) + (tTotal ? 1 : 0);
    return {
      pct: parts ? (habitsScore + (tTotal ? tDone / tTotal : 0)) / parts : 0,
      habitsDone: doneCount, habitsTotal: habits.length, ratios,
      tDone, tTotal
    };
  }

  // Discipline axis: average day score over the trailing 7 days (incl. viewed day).
  function consistency(key) {
    let sum = 0;
    for (let i = 0; i < 7; i++) sum += dayStats(U.addDaysKey(key, -i)).pct;
    return sum / 7;
  }

  function radarAxes(key) {
    const habits = activeHabits();
    const d = peekDay(key);
    const ratio = (h) => habitRatio(h, d ? d.habits[h.id] : null);
    const cats = [];
    for (const h of habits) if (h.category && !cats.includes(h.category)) cats.push(h.category);
    if (cats.length >= 5) {
      // 5+ categories exist -> top 5 by today's average completion
      const arr = cats.map((c) => {
        const hs = habits.filter((h) => h.category === c);
        return { label: c, value: hs.reduce((a, h) => a + ratio(h), 0) / hs.length };
      });
      arr.sort((a, b) => b.value - a.value);
      return arr.slice(0, 5);
    }
    // fallback: 5 fixed dimensions
    const stats = dayStats(key);
    const avg = (c) => {
      const hs = habits.filter((h) => h.category === c);
      return hs.length ? hs.reduce((a, h) => a + ratio(h), 0) / hs.length : 0;
    };
    return [
      { label: 'Spiritual', value: avg('Spiritual') },
      { label: 'Mind', value: avg('Mind') },
      { label: 'Body', value: avg('Body') },
      { label: 'Work/Tasks', value: stats.tTotal ? stats.tDone / stats.tTotal : 0 },
      { label: 'Discipline', value: consistency(key) }
    ];
  }

  function markCelebrated(key) {
    const d = ensureDay(key);
    if (d.celebrated) return false;
    d.celebrated = true;
    persist();
    return true;
  }

  /* ---------- profile / categories / tour ---------- */
  function getProfile() { return db.profile || {}; }

  function setProfile(patch) {
    db.profile = db.profile || {};
    Object.assign(db.profile, patch, { updatedAt: nowIso() });
    persist();
    return db.profile;
  }

  function categories() {
    const custom = (db.settings && db.settings.categories) || [];
    return DEFAULT_CATS.concat(custom);
  }

  function addCategory(name) {
    const n = String(name || '').trim();
    if (!n) return;
    db.settings = db.settings || {};
    db.settings.categories = db.settings.categories || [];
    if (!db.settings.categories.includes(n) && !DEFAULT_CATS.includes(n)) db.settings.categories.push(n);
    persist();
  }

  function markTourDone() {
    db.meta = db.meta || {};
    if (!db.meta.tourDone) { db.meta.tourDone = true; persist(); }
  }

  function markOnboarded() {
    db.meta = db.meta || {};
    if (!db.meta.onboarded) { db.meta.onboarded = true; persist(); }
  }

  /* ---------- seed: sample data so the UI is testable immediately ---------- */
  function seedSample() {
    const defs = [
      { name: 'Reading', unit: 'pages', target: 20, icon: '\u{1F4D6}', color: '#1CB0F6', category: 'Mind', subtasks: [] },
      { name: 'Deep Work', unit: 'hours', target: 4, icon: '\u{1F4BB}', color: '#1CB0F6', category: 'Work', subtasks: ['Plan tomorrow'] },
      { name: 'Workout', unit: 'minutes', target: 45, icon: '\u{1F4AA}', color: '#58CC02', category: 'Body', subtasks: ['Stretch 5 min', '30 push-ups'] },
      { name: 'Meditate', unit: 'minutes', target: 10, icon: '\u{1F9D8}', color: '#58CC02', category: 'Spiritual', subtasks: [] },
      { name: 'Drink Water', unit: 'custom', customUnit: 'glasses', target: 8, icon: '\u{1F4A7}', color: '#58CC02', category: 'Body', subtasks: [] },
      { name: 'Journal', unit: 'times', target: 1, icon: '\u270D\uFE0F', color: '#5B5F6E', category: 'Discipline', subtasks: [] }
    ];
    defs.forEach((def, i) => {
      db.habits.push({
        id: U.uid('h'), name: def.name, unit: def.unit, customUnit: def.customUnit || '',
        target: def.target, icon: def.icon, color: def.color, category: def.category,
        subtasks: (def.subtasks || []).map((t) => ({ id: U.uid('s'), title: t })),
        archived: false, createdAt: nowIso(), updatedAt: nowIso(), sortOrder: i + 1
      });
    });
    const H = {};
    db.habits.forEach((h) => { H[h.name] = h; });

    const now = nowIso();
    const mk = (v, note, st) => ({ v: v, note: note || '', st: st || {}, updatedAt: now });
    const t = U.todayKey();
    const y = U.addDaysKey(t, -1);
    const y2 = U.addDaysKey(t, -2);

    // two days ago: partial day, locked in as-is
    const e2 = ensureDay(y2);
    e2.habits[H['Reading'].id] = mk(12);
    e2.habits[H['Deep Work'].id] = mk(2);
    e2.habits[H['Workout'].id] = mk(30, '', { [H['Workout'].subtasks[0].id]: true });
    e2.habits[H['Drink Water'].id] = mk(5);
    e2.tasks = [
      { id: U.uid('t'), title: 'Grocery run', done: true, createdAt: now },
      { id: U.uid('t'), title: 'Fix leaky faucet', done: false, createdAt: now }
    ];

    // yesterday: a full day (locked in at 100%)
    const e1 = ensureDay(y);
    e1.habits[H['Reading'].id] = mk(20);
    e1.habits[H['Deep Work'].id] = mk(4, '', { [H['Deep Work'].subtasks[0].id]: true });
    e1.habits[H['Workout'].id] = mk(45, '', H['Workout'].subtasks.reduce((m, s) => (m[s.id] = true, m), {}));
    e1.habits[H['Meditate'].id] = mk(10, 'Felt scattered at first, much calmer after.');
    e1.habits[H['Drink Water'].id] = mk(8);
    e1.habits[H['Journal'].id] = mk(1);
    e1.tasks = [
      { id: U.uid('t'), title: 'Call the bank', done: true, createdAt: now },
      { id: U.uid('t'), title: '30 min Spanish practice', done: true, createdAt: now },
      { id: U.uid('t'), title: 'Water the plants', done: true, createdAt: now }
    ];
    e1.celebrated = true;

    // today: partial progress so the UI shows something alive
    const e0 = ensureDay(t);
    e0.habits[H['Reading'].id] = mk(8);
    e0.habits[H['Deep Work'].id] = mk(1.5);
    e0.habits[H['Workout'].id] = mk(25, '', { [H['Workout'].subtasks[0].id]: true });
    e0.habits[H['Meditate'].id] = mk(10);
    e0.habits[H['Drink Water'].id] = mk(3);
    e0.habits[H['Journal'].id] = mk(0);
    e0.tasks = [
      { id: U.uid('t'), title: 'Buy papers', doer: 'Sponge Bob', start: '', due: t, place: 'Stationery store, downtown', note: '', cat: null, done: false, createdAt: now },
      { id: U.uid('t'), title: "Reply to Sarah's email", doer: '', start: '', due: U.addDaysKey(t, 1), place: '', note: '', cat: 'Work', done: false, createdAt: now },
      { id: U.uid('t'), title: 'Book dentist appointment', doer: '', start: t, due: '', place: 'Smile Clinic, 5th Ave', note: 'Ask about Sunday hours', cat: null, done: true, createdAt: now }
    ];

    // weekly + monthly task lists for the current period
    db.periods.weeks[U.isoWeekKey(t)] = { tasks: [
      { id: U.uid('t'), title: 'Plan next week\u2019s meals', doer: '', start: '', due: '', place: '', note: '', cat: null, done: false, createdAt: now },
      { id: U.uid('t'), title: 'Laundry', doer: 'Mom', start: '', due: '', place: '', note: '', cat: null, done: true, createdAt: now },
      { id: U.uid('t'), title: 'Call grandparents', doer: '', start: '', due: '', place: '', note: '', cat: null, done: false, createdAt: now }
    ]};
    db.periods.months[U.monthKey(t)] = { tasks: [
      { id: U.uid('t'), title: 'Pay rent', doer: 'Dad', start: '', due: '', place: 'Bank app', note: '', cat: null, done: true, createdAt: now },
      { id: U.uid('t'), title: 'Back up photos', doer: '', start: '', due: '', place: '', note: '', cat: null, done: false, createdAt: now },
      { id: U.uid('t'), title: 'Review monthly budget', doer: '', start: '', due: '', place: '', note: '', cat: null, done: false, createdAt: now }
    ]};
  }


  /* ---------- settings ---------- */
  function getSetting(key, fallback) {
    db.settings = db.settings || {};
    const v = db.settings[key];
    return (v === undefined || v === null) ? fallback : v;
  }

  function setSetting(key, value) {
    db.settings = db.settings || {};
    db.settings[key] = value;
    persist();
  }

  /* ---------- streaks ---------- */
  const MILESTONES = [7, 30, 100, 365];

  function goalPct() { return Number(getSetting('goalPct', 80)) || 80; }

  function isGoalDay(key) { return dayStats(key).pct >= goalPct() / 100; }

  function firstLoggedDay() {
    const keys = Object.keys(db.days).filter((k) => {
      const d = db.days[k];
      return d && (Object.keys(d.habits || {}).length || (d.tasks && d.tasks.length));
    }).sort();
    return keys.length ? keys[0] : null;
  }

  function milestones() { return Object.assign({}, (db.meta && db.meta.milestones) || {}); }

  // Current streak counts consecutive goal days ending today (today counts
  // as soon as it reaches the goal; it never breaks the streak mid-day).
  function streakInfo() {
    const today = U.todayKey();
    const first = firstLoggedDay();
    let current = 0;
    if (first) {
      let cursor = isGoalDay(today) ? today : U.addDaysKey(today, -1);
      while (cursor >= first && isGoalDay(cursor)) { current++; cursor = U.addDaysKey(cursor, -1); }
    }
    let longest = 0, run = 0;
    if (first) {
      for (let k = first; k <= today; k = U.addDaysKey(k, 1)) {
        if (isGoalDay(k)) { run++; if (run > longest) longest = run; }
        else run = 0;
      }
    }
    const next = MILESTONES.find((m) => m > current) || null;
    return { current, longest, next, goalPct: goalPct() };
  }

  function milestoneCheck() {
    const info = streakInfo();
    const ms = (db.meta && db.meta.milestones) || {};
    const hit = MILESTONES.filter((m) => info.current >= m && !ms[m]);
    if (!hit.length) return null;
    db.meta.milestones = db.meta.milestones || {};
    hit.forEach((m) => { db.meta.milestones[m] = U.todayKey(); });
    persist();
    return hit[hit.length - 1];
  }

  function habitStreak(habitId) {
    const h = habitById(habitId);
    if (!h) return { current: 0, longest: 0 };
    const first = firstLoggedDay();
    const today = U.todayKey();
    const full = (k) => {
      const d = peekDay(k);
      return d ? habitRatio(h, d.habits[habitId] || null) >= 0.999 : false;
    };
    let current = 0;
    let cursor = full(today) ? today : U.addDaysKey(today, -1);
    while (cursor >= (first || cursor) && full(cursor)) { current++; cursor = U.addDaysKey(cursor, -1); }
    let longest = 0, run = 0;
    if (first) {
      for (let k = first; k <= today; k = U.addDaysKey(k, 1)) {
        if (full(k)) { run++; if (run > longest) longest = run; }
        else run = 0;
      }
    }
    return { current, longest };
  }

  /* ---------- restore / delete / import ---------- */
  function restoreHabit(id) {
    const h = habitById(id);
    if (!h) return null;
    h.archived = false;
    delete h.archivedAt;
    const maxSort = db.habits.reduce((m, x) => Math.max(m, x.sortOrder || 0), 0);
    h.sortOrder = maxSort + 1;
    h.updatedAt = nowIso();
    persist();
    return h;
  }

  function deleteHabitForever(id) {
    const i = db.habits.findIndex((x) => x.id === id);
    if (i >= 0) { db.habits.splice(i, 1); persist(); }
  }

  function importData(obj) {
    if (!obj || obj.schemaVersion !== 1 || !Array.isArray(obj.habits) || !obj.days || typeof obj.days !== 'object') {
      throw new Error('Not a valid HabitTrack backup');
    }
    db = {
      schemaVersion: 1,
      createdAt: obj.createdAt || nowIso(),
      updatedAt: nowIso(),
      habits: obj.habits,
      days: obj.days,
      periods: obj.periods || { weeks: {}, months: {} },
      meta: obj.meta || {},
      settings: obj.settings || {}
    };
    db.meta.seeded = true;
    db.meta.milestones = db.meta.milestones || {};
    db.periods = db.periods || { weeks: {}, months: {} };
    migrateAllTasks();
    persist();
  }

  return {
    load, reset,
    habitById, activeHabits, addHabit, updateHabit, archiveHabit,
    peekDay, entryFor, setHabitValue, completeHabitDay, resetHabitDay, toggleSubtask, setNote,
    dailyTasks, peekPeriodTasks, addTask, updateTask, moveTask, moveTaskTo, toggleTask, deleteTask,
    habitRatio, dayStats, consistency, radarAxes, markCelebrated, habitWeight, unitEffort, effortPerUnit,
    getSetting, setSetting, goalPct, streakInfo, milestoneCheck, milestones, firstLoggedDay, habitStreak,
    restoreHabit, deleteHabitForever, importData, eraseAll, loadSample,
    getProfile, setProfile, categories, addCategory, markTourDone, markOnboarded,
    get data() { return db; }
  };
})();
