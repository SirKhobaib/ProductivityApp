'use strict';

/* Habit list: rendering + gestures.
   - tap +/- : adjust today's value by the unit's step
   - long-press (2s) anywhere on the card : day note for that habit
   - double-tap right half : mark habit + subtasks fully complete
   - double-tap left half  : reset habit + subtasks to not-started
   - pencil icon : edit sheet (ID shown there) */
const Habits = (() => {
  // Increment step per unit
  const STEPS = { pages: 1, times: 1, minutes: 5, hours: 0.5, custom: 1 };

  let list = null;
  let lpTimer = 0;
  let lpFired = false;
  let downPos = null;
  let lastTap = { t: 0, id: null };

  const unitLabel = (h) => {
    if (h.unit === 'custom') return h.customUnit || T('unitUnits');
    if (I18N.get() === 'en' && Number(h.target) === 1) return { pages: 'page', times: 'time', minutes: 'minute', hours: 'hour' }[h.unit] || h.unit;
    const keys = { pages: 'unitPages', times: 'unitTimes', minutes: 'unitMinutes', hours: 'unitHours' };
    return T(keys[h.unit] || 'unitUnits');
  };

  const EDIT_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';

  function cardHTML(h) {
    const editable = !App.isFuture();
    const e = Store.entryFor(App.viewKey(), h.id);
    const val = e ? (e.v || 0) : 0;
    const ratio = Store.habitRatio(h, e);
    const hasNote = !!(e && e.note);
    const subtasks = h.subtasks.length ? `
      <div class="subtasks">${h.subtasks.map((s) => {
        const done = !!(e && e.st && e.st[s.id]);
        return `<button type="button" class="sub-pill${done ? ' done' : ''}" data-act="sub" data-sub="${s.id}"${editable ? '' : ' disabled'}><span class="sub-check">${done ? '\u2713' : ''}</span>${U.esc(s.title)}</button>`;
      }).join('')}</div>` : '';
    return `
    <article class="habit-card" data-id="${h.id}">
      <div class="icon-chip" style="background:${U.rgba(h.color, 0.14)}">${h.icon}</div>
      <div class="habit-main">
        <div class="habit-name-row">
          <span class="habit-name">${U.esc(h.name)}</span>
          ${hasNote ? `<span class="note-flag">${T('noteFlag')}</span>` : ''}
          <button type="button" class="edit-btn" data-act="edit" aria-label="Edit ${U.esc(h.name)}">${EDIT_SVG}</button>
        </div>
        <div class="habit-meta">
          <span class="habit-val">${I18N.num(U.fmtNum(val))} / ${I18N.num(U.fmtNum(h.target))} ${U.esc(unitLabel(h))}</span>
          <span class="habit-bar"><span class="habit-bar-fill" style="width:${Math.round(ratio * 100)}%;background:${h.color}"></span></span>
        </div>
        ${subtasks}
      </div>
      <div class="habit-ctl">
        <button type="button" class="round-btn" data-act="dec" aria-label="Decrease"${editable ? '' : ' disabled'}>&minus;</button>
        <button type="button" class="round-btn inc" data-act="inc" aria-label="Increase"${editable ? '' : ' disabled'}>+</button>
      </div>
    </article>`;
  }

  function render() {
    const habits = Store.activeHabits();
    if (!habits.length) {
      list.innerHTML = '<div class="empty">' + T('noHabitsYet') + '</div>';
      return;
    }
    list.innerHTML = habits.map(cardHTML).join('');
  }

  function guard() {
    if (!App.isFuture()) return false;
    U.toast(T('futureLocked'));
    return true;
  }

  function adjust(id, dir) {
    if (guard()) return;
    const h = Store.habitById(id);
    if (!h) return;
    const step = STEPS[h.unit] || 1;
    const e = Store.entryFor(App.viewKey(), id);
    const cur = e ? (e.v || 0) : 0;
    Store.setHabitValue(App.viewKey(), id, cur + dir * step);
    App.refresh();
  }

  function complete(id) {
    if (guard()) return;
    const h = Store.habitById(id);
    if (!h) return;
    Store.completeHabitDay(App.viewKey(), id, h.target);
    App.refresh();
  }

  function reset(id) {
    if (guard()) return;
    Store.resetHabitDay(App.viewKey(), id);
    App.refresh();
  }

  function toggleSub(id, subId) {
    if (guard()) return;
    Store.toggleSubtask(App.viewKey(), id, subId);
    App.refresh();
  }

  function handleButton(btn) {
    const act = btn.dataset.act;
    const card = btn.closest('.habit-card');
    if (!act || !card || btn.disabled) return;
    const id = card.dataset.id;
    if (act === 'inc') adjust(id, 1);
    else if (act === 'dec') adjust(id, -1);
    else if (act === 'edit') Sheets.openHabitForm(id);
    else if (act === 'sub') toggleSub(id, btn.dataset.sub);
  }

  function onLongPress(id) {
    if (App.isFuture()) { U.toast(T('notesFuture')); return; }
    if (navigator.vibrate) { try { navigator.vibrate(10); } catch (err) { /* unsupported */ } }
    Sheets.openNote(id, App.viewKey());
  }

  function init() {
    list = document.getElementById('habitList');

    // Suppress the long-press context menu / callout on cards.
    list.addEventListener('contextmenu', (e) => { if (e.target.closest('.habit-card')) e.preventDefault(); });

    // Long-press (2s) anywhere on the card (except its buttons) -> note sheet.
    list.addEventListener('pointerdown', (e) => {
      const card = e.target.closest('.habit-card');
      if (!card || e.target.closest('button, input, textarea, select')) return;
      downPos = { x: e.clientX, y: e.clientY };
      lpFired = false;
      const id = card.dataset.id;
      clearTimeout(lpTimer);
      lpTimer = setTimeout(() => { lpFired = true; onLongPress(id); }, 2000);
    });
    list.addEventListener('pointermove', (e) => {
      if (lpTimer && downPos && (Math.abs(e.clientX - downPos.x) > 12 || Math.abs(e.clientY - downPos.y) > 12)) clearTimeout(lpTimer);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) =>
      list.addEventListener(ev, () => clearTimeout(lpTimer))
    );

    // Buttons + double-tap halves (right -> complete, left -> reset).
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (btn) { handleButton(btn); return; }
      const card = e.target.closest('.habit-card');
      if (!card) return;
      if (lpFired) { lpFired = false; return; }
      const now = Date.now();
      if (lastTap.id === card.dataset.id && now - lastTap.t < 320) {
        lastTap = { t: 0, id: null };
        const rect = card.getBoundingClientRect();
        const rightHalf = e.clientX > rect.left + rect.width / 2;
        if (rightHalf) complete(card.dataset.id);
        else reset(card.dataset.id);
      } else {
        lastTap = { t: now, id: card.dataset.id };
      }
    });
  }

  return { render, init };
})();
