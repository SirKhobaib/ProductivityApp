/* Dev smoke test for the data store. Run: node dev-test-store.js */
const fs = require('fs');
const path = require('path');

global.localStorage = {
  _d: {},
  getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; }
};

const code =
  fs.readFileSync(path.join(__dirname, 'js', 'util.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(__dirname, 'js', 'i18n.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(__dirname, 'js', 'jalali.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(__dirname, 'js', 'store.js'), 'utf8') + '\n' +
  'module.exports = { U: U, I18N: I18N, Jalali: Jalali, Store: Store, T: T };';
const { U, I18N, Jalali, Store, T } = eval(code);

let failures = 0;
function check(name, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name);
  if (!cond) failures++;
}

/* seed: the app now starts clean — no sample data */
Store.load();
check('seed starts clean (no habits)', Store.data.habits.length === 0);
check('seed starts clean (no days)', Object.keys(Store.data.days).length === 0);
check('seed marks storage initialized', Store.data.meta.seeded === true);
Store.loadSample();
check('loadSample loads 6 habits', Store.data.habits.length === 6);
check('loadSample loads 3 day records', Object.keys(Store.data.days).length === 3);

/* streaks (default goal 80%) */
const info = Store.streakInfo();
check('streak current is 1 (only yesterday >= 80%)', info.current === 1);
check('streak longest is 1', info.longest === 1);
check('next milestone is 7', info.next === 7);
check('goal pct default 80', info.goalPct === 80);

/* goal setting changes streak math */
Store.setSetting('goalPct', 30);
check('goal 30% -> all 3 seeded days qualify (100/51/40%), streak 3', Store.streakInfo().current === 3);
Store.setSetting('goalPct', 80);
check('goal back to 80% -> streak 1', Store.streakInfo().current === 1);

/* habit streaks */
const reading = Store.activeHabits().find((h) => h.name === 'Reading');
const rs = Store.habitStreak(reading.id);
check('reading streak computed', typeof rs.current === 'number' && typeof rs.longest === 'number');

/* radar */
check('radar has 5 axes', Store.radarAxes(U.todayKey()).length === 5);

/* erase all */
Store.eraseAll();
check('eraseAll empties habits', Store.data.habits.length === 0);
check('eraseAll empties days', Object.keys(Store.data.days).length === 0);
check('eraseAll keeps storage initialized', Store.data.meta.seeded === true);
const parsed = JSON.parse(localStorage.getItem('habittrack.v1'));
check('empty state persists (no re-seed on reload)', parsed.meta.seeded === true && parsed.habits.length === 0);

/* load sample */
Store.loadSample();
check('loadSample restores 6 habits', Store.data.habits.length === 6);
check('loadSample restores 3 days', Object.keys(Store.data.days).length === 3);

/* archive -> restore by id (re-find after loadSample: ids are regenerated) */
const reading2 = Store.activeHabits().find((h) => h.name === 'Reading');
Store.archiveHabit(reading2.id);
check('archive hides habit', Store.activeHabits().length === 5);
check('habitById still finds archived', Store.habitById(reading2.id) !== null);
Store.restoreHabit(reading2.id);
check('restore returns habit to active list', Store.activeHabits().length === 6);

/* past-day editing (v2) */
const yKey = U.addDaysKey(U.todayKey(), -1);
const water = Store.activeHabits().find((h) => h.name === 'Drink Water');
Store.setHabitValue(yKey, water.id, water.target);
const yStats = Store.dayStats(yKey);
check('past day value editable', yStats.ratios[water.id] >= 0.999);

/* cascade setting */
Store.setSetting('cascadeTasks', false);
check('cascade off persists', Store.getSetting('cascadeTasks', true) === false);
Store.setSetting('cascadeTasks', true);
check('cascade on persists', Store.getSetting('cascadeTasks', true) !== false);

/* weekly/monthly task access for cascade */
const wk = Store.peekPeriodTasks('weekly', U.isoWeekKey(U.todayKey()));
const mo = Store.peekPeriodTasks('monthly', U.monthKey(U.todayKey()));
check('weekly period tasks seeded', wk.length === 3);
check('monthly period tasks seeded', mo.length === 3);

/* add-task sheet path (weekly scope) */
Store.addTask('weekly', U.isoWeekKey(U.todayKey()), 'Test weekly task');
check('addTask weekly works', Store.peekPeriodTasks('weekly', U.isoWeekKey(U.todayKey())).length === 4);

/* import validation */
let threw = false;
try { Store.importData({ nope: 1 }); } catch (e) { threw = true; }
check('importData rejects invalid blobs', threw);

/* ---- v3: effort weighting (deep work outweighs tiny habits) ---- */
Store.eraseAll();
const dw = Store.addHabit({ name: 'DW', unit: 'hours', target: 4, category: 'Work' });
const med = Store.addHabit({ name: 'MED', unit: 'minutes', target: 10, category: 'Spiritual' });
check('habitWeight: deep work is 24x meditation', Math.round(Store.habitWeight(dw) / Store.habitWeight(med)) === 24);
const tk = U.todayKey();
Store.setHabitValue(tk, dw.id, 2); // half of deep work
const s1 = Store.dayStats(tk);
check('effort: half deep work alone = 48% of the day', Math.abs(s1.pct - 0.48) < 0.001);
Store.setHabitValue(tk, med.id, med.target); // full meditation (tiny weight)
const s2 = Store.dayStats(tk);
check('effort: full tiny meditation adds only ~4 points (52%)', Math.abs(s2.pct - 0.52) < 0.001);
Store.setHabitValue(tk, dw.id, dw.target); // full deep work
const s3 = Store.dayStats(tk);
check('effort: full deep work completes the habit block (100%)', Math.abs(s3.pct - 1) < 0.001);

/* ---- v3: jalali conversion ---- */
const samples = ['2026-08-29', '2025-12-21', '2024-03-20', '2021-03-21', '2026-03-20', '2024-12-21'];
let rtOk = true;
samples.forEach((k) => {
  const d = U.keyToDate(k);
  const j = Jalali.toJalali(d);
  const back = Jalali.fromJalali(j[0], j[1], j[2]);
  if (U.dateKey(back) !== k) rtOk = false;
});
check('jalali round-trip preserves dates', rtOk);
const nowruz1403 = Jalali.fromJalali(1403, 1, 1);
check('jalali 1403/1/1 = 2024-03-20', U.dateKey(nowruz1403) === '2024-03-20');
check('jalali leap year: 1403 esfand has 30 days', Jalali.monthLength(1403, 12) === 30);
check('jalali normal year: 1404 esfand has 29 days', Jalali.monthLength(1404, 12) === 29);
check('afghan month table: month 1 is \u062D\u0645\u0644', Jalali.monthNames('afghan')[0] === '\u062D\u0645\u0644');
check('iranian month table: month 1 is \u0641\u0631\u0648\u0631\u062F\u06CC\u0646', Jalali.monthNames('iran')[0] === '\u0641\u0631\u0648\u0631\u062F\u06CC\u0646');

/* ---- v3: i18n ---- */
I18N.setLang('fa');
check('fa: habits translated', T('habits') === '\u0639\u0627\u062F\u062A\u200C\u0647\u0627');
check('fa: persian digits', I18N.num(42) === '\u06F4\u06F2');
check('fa: isRTL true', I18N.isRTL() === true);
check('fa: default category translates', I18N.cat('Mind') === '\u0630\u0647\u0646');
I18N.setLang('en');
check('en: habits back to english', T('habits') === 'Habits');
check('cat: unknown custom passes through', I18N.cat('Side Project') === 'Side Project');

/* ---- v3: categories ---- */
check('categories include defaults', ['Spiritual', 'Mind', 'Body', 'Work', 'Discipline', 'Important', 'Priority'].every((c) => Store.categories().includes(c)));
Store.addCategory('Side Project');
check('addCategory works', Store.categories().includes('Side Project'));
Store.addCategory('Side Project');
check('addCategory is idempotent', Store.categories().filter((c) => c === 'Side Project').length === 1);

/* ---- v3: task categories ---- */
Store.addTask('daily', U.todayKey(), 'Categorized task', 'Important');
const todayTasks = Store.dailyTasks(U.todayKey());
check('task stores its category', todayTasks.some((t) => t.cat === 'Important'));

/* ---- v3: profile ---- */
Store.setProfile({ name: 'Ali', username: 'ali', color: '#1CB0F6' });
check('profile saves', Store.getProfile().name === 'Ali' && Store.getProfile().color === '#1CB0F6');

/* ---- v4: task details (doer / start / due / place / note) ---- */
Store.eraseAll();
const dKey = U.todayKey();
const rich = Store.addTask('daily', dKey, 'Buy papers', null, { doer: 'Sponge Bob', due: dKey, place: 'Stationery downtown', note: 'A4, 100 sheets' });
check('v4: task stores doer', rich.doer === 'Sponge Bob');
check('v4: task stores due + place + note', rich.due === dKey && rich.place === 'Stationery downtown' && rich.note === 'A4, 100 sheets');
const rich2 = Store.addTask('daily', dKey, 'Second thing', 'Work');
Store.updateTask('daily', dKey, rich2.id, { title: 'Second thing edited', doer: 'Patrick', due: U.addDaysKey(dKey, 2) });
const afterEdit = Store.dailyTasks(dKey).find((x) => x.id === rich2.id);
check('v4: updateTask edits fields', afterEdit.title === 'Second thing edited' && afterEdit.doer === 'Patrick' && afterEdit.due === U.addDaysKey(dKey, 2));
check('v4: order before move', Store.dailyTasks(dKey)[0].id === rich.id && Store.dailyTasks(dKey)[1].id === rich2.id);
check('v4: moveTask up is blocked at top', Store.moveTask('daily', dKey, rich.id, -1) === false);
Store.moveTask('daily', dKey, rich.id, 1);
check('v4: moveTask down swaps order', Store.dailyTasks(dKey)[0].id === rich2.id && Store.dailyTasks(dKey)[1].id === rich.id);
Store.moveTask('daily', dKey, rich.id, -1);
check('v4: moveTask back restores order', Store.dailyTasks(dKey)[0].id === rich.id);

/* ---- v4: old-task migration ---- */
Store.data.days[dKey].tasks.push({ id: 'tOLD1', title: 'Legacy task', done: false, createdAt: 'z' });
delete Store.data.days[dKey].tasks[0].doer;
Store.importData(JSON.parse(JSON.stringify(Store.data)));
const legacy = Store.dailyTasks(dKey).find((x) => x.id === 'tOLD1');
check('v4: import migrates legacy task fields', !!legacy && legacy.doer === '' && legacy.due === '' && legacy.place === '' && legacy.note === '');

/* ---- v4: onboarding flag ---- */
Store.markOnboarded();
check('v4: markOnboarded persists', Store.data.meta.onboarded === true);

/* ---- v5: task times + drag reorder ---- */
Store.eraseAll();
const dKey5 = U.todayKey();
const timed = Store.addTask('daily', dKey5, 'Timed task', null, { start: dKey5, startTime: '09:00', due: dKey5, dueTime: '14:30' });
check('v5: addTask stores startTime/dueTime', timed.startTime === '09:00' && timed.dueTime === '14:30');
const plain = Store.addTask('daily', dKey5, 'Plain task');
check('v5: addTask defaults time fields to empty', plain.startTime === '' && plain.dueTime === '');
const second = Store.addTask('daily', dKey5, 'Second');
check('v5: order before move', Store.dailyTasks(dKey5)[0].id === timed.id && Store.dailyTasks(dKey5)[2].id === second.id);
check('v5: moveTaskTo drags down', Store.moveTaskTo('daily', dKey5, timed.id, 2) === true && Store.dailyTasks(dKey5)[2].id === timed.id);
check('v5: moveTaskTo drags up', Store.moveTaskTo('daily', dKey5, timed.id, 0) === true && Store.dailyTasks(dKey5)[0].id === timed.id);
check('v5: moveTaskTo clamps out-of-range', Store.moveTaskTo('daily', dKey5, timed.id, 99) === true && Store.dailyTasks(dKey5)[2].id === timed.id);
check('v5: moveTaskTo same index is a no-op', Store.moveTaskTo('daily', dKey5, timed.id, 2) === false);
check('v5: moveTask (1-step) still works', Store.moveTask('daily', dKey5, timed.id, -1) === true && Store.dailyTasks(dKey5)[1].id === timed.id);
Store.data.days[dKey5].tasks.push({ id: 'tOLD9', title: 'Legacy timed', done: false, createdAt: 'z' });
Store.importData(JSON.parse(JSON.stringify(Store.data)));
const legacy9 = Store.dailyTasks(dKey5).find((x) => x.id === 'tOLD9');
check('v5: import migrates time fields to empty', !!legacy9 && legacy9.startTime === '' && legacy9.dueTime === '');

/* ---- v6: undo / redo ---- */
Store.eraseAll();
const dK6 = U.todayKey();
Store.addTask('daily', dK6, 'Undo me');
check('v6: task added', Store.dailyTasks(dK6).length === 1);
check('v6: undo removes the task', Store.undo() === true && Store.dailyTasks(dK6).length === 0);
check('v6: redo restores the task', Store.redo() === true && Store.dailyTasks(dK6).length === 1);
(function () { while (Store.undo()) { /* rewind to the start */ } })();
check('v6: cannot undo past the start', Store.canUndo() === false && Store.dailyTasks(dK6).length === 0);
(function () { while (Store.redo()) { /* fast-forward to the latest */ } })();
check('v6: redo reaches latest state', Store.canRedo() === false && Store.dailyTasks(dK6).length === 1);
check('v6: habit mutation is undoable too', (function () {
  Store.addHabit({ name: 'Undo habit', unit: 'times', target: 1 });
  const had = Store.activeHabits().some((h) => h.name === 'Undo habit');
  const ok = Store.undo();
  return had && ok && !Store.activeHabits().some((h) => h.name === 'Undo habit');
})());

console.log(failures === 0 ? '\nALL TESTS PASSED' : '\n' + failures + ' TEST(S) FAILED');
process.exit(failures ? 1 : 0);
