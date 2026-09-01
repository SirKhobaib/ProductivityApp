'use strict';

/* Tasks: Daily / Weekly / Monthly checklists.
   Daily tasks live in the day record; weekly/monthly live in period records
   (so they don't duplicate across days). With "Show big tasks in small
   ranges" on, weekly/monthly tasks also render inside smaller ranges —
   grayed, with their category chip.
   Row = check + number + title (+ doer chip + due chip). Tap row = toggle.
   Tap the title (or the ✎ button) = edit sheet. Hold 0.3s = drag to reorder.
   Past days are editable; only future dates are locked. */
const Tasks = (() => {
  let listEl, inputEl, tabsEl, scopeEl, hintEl, addRow;

  const EDIT_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';

  const scopeKey = () => {
    const t = App.taskTab(), v = App.viewKey();
    return t === 'weekly' ? U.isoWeekKey(v) : t === 'monthly' ? U.monthKey(v) : v;
  };

  // Past days are editable (v2); only future dates/periods are locked.
  const editable = () => {
    const t = App.taskTab(), v = App.viewKey(), today = U.todayKey();
    if (t === 'daily') return v <= today;
    if (t === 'weekly') return U.mondayOf(v) <= today;
    return U.monthKey(v) <= U.monthKey(today);
  };

  const pad2 = (n) => (n < 10 ? '0' + n : String(n));

  // Current clock as 'HH:MM' — compares lexicographically with task times.
  const nowHHMM = () => {
    const n = new Date();
    return pad2(n.getHours()) + ':' + pad2(n.getMinutes());
  };

  function dueChip(it) {
    if (!it.due) return '';
    const today = U.todayKey();
    const hhmm = nowHHMM();
    const withTime = it.dueTime ? ' \u00B7 ' + I18N.num(it.dueTime) : '';
    let cls = 'task-due';
    let label = U.fmtDayShort(it.due) + withTime;
    const overdue = !it.done && (it.due < today || (it.due === today && it.dueTime && it.dueTime <= hhmm));
    if (overdue) { cls += ' overdue'; label = T('overdue') + ' \u00B7 ' + U.fmtDayShort(it.due) + withTime; }
    else if (!it.done && it.due === today) { cls += ' due-today'; label = T('dueToday') + withTime; }
    // "soon": uncompleted, due tomorrow with a time earlier than right now (within 24h)
    else if (!it.done && it.due === U.addDaysKey(today, 1) && it.dueTime && it.dueTime <= hhmm) {
      cls += ' due-soon';
      label = T('dueSoon') + ' \u00B7 ' + I18N.num(it.dueTime);
    }
    return `<span class="${cls}">${U.esc(label)}</span>`;
  }

  function taskHTML(it, kind, pkey, ed, idx, cascaded) {
    const doer = it.doer
      ? `<span class="task-doer">\u{1F464} ${U.esc(it.doer)}</span>` : '';
    const cat = cascaded && it.cat
      ? `<span class="task-cat">${U.esc(I18N.cat(it.cat))}</span>` : '';
    return `
      <li class="task-item${it.done ? ' done' : ''}${cascaded ? ' ghost' : ''}" data-kind="${kind}" data-pkey="${pkey}" data-id="${it.id}">
        <button type="button" class="check${it.done ? ' on' : ''}" data-act="toggle" aria-label="Toggle complete"${ed ? '' : ' disabled'}><span>${it.done ? '\u2713' : ''}</span></button>
        <span class="task-num">${I18N.num(pad2(idx + 1))}</span>
        <span class="task-main">
          <span class="task-line"><button type="button" class="task-title-btn" data-act="edit" aria-label="${T('editTask')}"${ed ? '' : ' disabled'}>${cat}${U.esc(it.title)}</button>${dueChip(it)}</span>
          ${doer}
        </span>
        <button type="button" class="task-edit" data-act="edit" aria-label="${T('editTask')}"${ed ? '' : ' disabled'}>${EDIT_SVG}</button>
        <button type="button" class="task-del" data-act="del" aria-label="Delete task"${ed ? '' : ' disabled'}>&times;</button>
      </li>`;
  }

  function groupHTML(title, items, kind, pkey, ed) {
    return `<li class="task-group-h">${title}</li>` +
      items.map((it, i) => taskHTML(it, kind, pkey, ed, i, true)).join('');
  }

  function render() {
    const t = App.taskTab();
    tabsEl.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.scope === t));
    scopeEl.textContent = t === 'weekly' ? T('weekOf', { r: U.weekLabel(App.viewKey()) })
      : t === 'monthly' ? U.fmtMonthYear(U.keyToDate(App.viewKey()))
      : U.fmtFull(App.viewKey());

    const ed = editable();
    addRow.hidden = !ed;
    hintEl.hidden = ed;
    if (!ed) hintEl.textContent = T('futureRO');
    inputEl.placeholder = T('addTaskPh');

    const catSel = document.getElementById('taskCatSel');
    if (catSel) {
      catSel.innerHTML = `<option value="">${T('noCat')}</option>` +
        Store.categories().map((c) => `<option value="${U.esc(c)}">${U.esc(I18N.cat(c))}</option>`).join('');
    }

    const v = App.viewKey();
    const cascade = Store.getSetting('cascadeTasks', true) !== false;
    let html = '';
    if (t === 'daily') {
      const items = Store.dailyTasks(v);
      html = items.map((it, i) => taskHTML(it, 'daily', v, ed, i, false)).join('');
      if (cascade) {
        const wk = Store.peekPeriodTasks('weekly', U.isoWeekKey(v));
        if (wk.length) html += groupHTML(T('thisWeek'), wk, 'weekly', U.isoWeekKey(v), ed);
        const mo = Store.peekPeriodTasks('monthly', U.monthKey(v));
        if (mo.length) html += groupHTML(T('thisMonth'), mo, 'monthly', U.monthKey(v), ed);
      }
    } else if (t === 'weekly') {
      const wk = Store.peekPeriodTasks('weekly', U.isoWeekKey(v));
      html = wk.map((it, i) => taskHTML(it, 'weekly', U.isoWeekKey(v), ed, i, false)).join('');
      if (cascade) {
        const mo = Store.peekPeriodTasks('monthly', U.monthKey(v));
        if (mo.length) html += groupHTML(T('thisMonth'), mo, 'monthly', U.monthKey(v), ed);
      }
    } else {
      const mo = Store.peekPeriodTasks('monthly', U.monthKey(v));
      html = mo.map((it, i) => taskHTML(it, 'monthly', U.monthKey(v), ed, i, false)).join('');
    }
    listEl.innerHTML = html || '<li class="empty small">' + T('nothingHere') + '</li>';
  }

  function add() {
    if (!editable()) return;
    const v = inputEl.value.trim();
    if (!v) return;
    const catSel = document.getElementById('taskCatSel');
    Store.addTask(App.taskTab(), scopeKey(), v, catSel ? (catSel.value || null) : null);
    inputEl.value = '';
    App.refresh();
    inputEl.focus();
  }

  function rowFrom(el) {
    const li = el.closest('.task-item');
    if (!li || !li.dataset.id) return null;
    return { li, kind: li.dataset.kind || App.taskTab(), key: li.dataset.pkey || scopeKey(), id: li.dataset.id };
  }

  function openEdit(row) {
    const list = row.kind === 'daily' ? Store.dailyTasks(row.key) : Store.peekPeriodTasks(row.kind, row.key);
    const it = (list || []).find((x) => x.id === row.id);
    if (it) Sheets.openTaskSheet(it, row.kind, row.key);
  }

  /* ---------- drag to reorder (hold a row 0.3s, then drag) ---------- */
  let drag = null;          // { row, li, y0, origIdx, insertion, pointerId }
  let dragJustEnded = 0;

  // Rows of the same scope list in DOM order (cascaded ghosts excluded).
  function dragGroup(li) {
    return Array.prototype.slice.call(listEl.querySelectorAll('.task-item:not(.ghost)'))
      .filter((x) => x.dataset.kind === li.dataset.kind && x.dataset.pkey === li.dataset.pkey);
  }

  function startDrag(row, e) {
    const group = dragGroup(row.li);
    drag = {
      row, li: row.li, y0: e.clientY, pointerId: e.pointerId,
      origIdx: group.indexOf(row.li),
      insertion: group.indexOf(row.li)
    };
    row.li.classList.add('dragging');
    if (row.li.setPointerCapture) { try { row.li.setPointerCapture(e.pointerId); } catch (err) { /* ok */ } }
    if (navigator.vibrate) { try { navigator.vibrate(10); } catch (err) { /* unsupported */ } }
    document.body.classList.add('task-dragging');
  }

  function dragMove(e) {
    if (!drag) return;
    e.preventDefault();
    drag.li.style.transform = 'translateY(' + (e.clientY - drag.y0) + 'px)';
    // Insertion index = first sibling whose midpoint is below the pointer.
    const others = dragGroup(drag.li).filter((x) => x !== drag.li);
    let ins = others.length;
    for (let i = 0; i < others.length; i++) {
      const r = others[i].getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) { ins = i; break; }
    }
    if (ins !== drag.insertion) {
      drag.insertion = ins;
      listEl.querySelectorAll('.drop-hint').forEach((x) => x.classList.remove('drop-hint'));
      if (others[ins]) others[ins].classList.add('drop-hint');
    }
  }

  function endDrag(commit) {
    const d = drag;
    drag = null;
    dragJustEnded = Date.now();
    document.body.classList.remove('task-dragging');
    listEl.querySelectorAll('.drop-hint').forEach((x) => x.classList.remove('drop-hint'));
    if (!d) return;
    d.li.classList.remove('dragging');
    d.li.style.transform = '';
    if (commit && d.insertion !== d.origIdx) {
      Store.moveTaskTo(d.row.kind, d.row.key, d.row.id, d.insertion);
    }
    App.refresh();
  }

  function init() {
    listEl = document.getElementById('taskList');
    inputEl = document.getElementById('taskInput');
    tabsEl = document.getElementById('taskTabs');
    scopeEl = document.getElementById('taskScopeLabel');
    hintEl = document.getElementById('taskHint');
    addRow = document.getElementById('taskAddRow');

    document.getElementById('taskAddBtn').addEventListener('click', add);
    inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });

    tabsEl.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-scope]');
      if (b) App.setTaskTab(b.dataset.scope);
    });

    // Hold a row for 0.3s -> drag mode. Moving >12px before that cancels the hold.
    // Buttons (check / title / ✎ / ×) never start a drag or a hold.
    listEl.addEventListener('contextmenu', (e) => { if (e.target.closest('.task-item')) e.preventDefault(); });
    let holdTimer = 0, downPos = null;
    listEl.addEventListener('pointerdown', (e) => {
      const row = rowFrom(e.target);
      if (!row || e.target.closest('button')) return;
      if (!editable() || row.kind !== App.taskTab()) return; // ghosts belong to another list
      downPos = { x: e.clientX, y: e.clientY };
      clearTimeout(holdTimer);
      holdTimer = setTimeout(() => {
        holdTimer = 0;
        startDrag(row, e);
      }, 300);
    });
    listEl.addEventListener('pointermove', (e) => {
      if (holdTimer && downPos && (Math.abs(e.clientX - downPos.x) > 12 || Math.abs(e.clientY - downPos.y) > 12)) {
        clearTimeout(holdTimer);
        holdTimer = 0;
      }
      if (drag) dragMove(e);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) =>
      listEl.addEventListener(ev, () => {
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = 0; }
      })
    );
    // Window-level release so a drag always ends, even if capture is unavailable.
    window.addEventListener('pointerup', () => { if (drag) endDrag(true); });
    window.addEventListener('pointercancel', () => { if (drag) endDrag(false); });
    // While dragging, stop the page from scrolling (touch devices).
    listEl.addEventListener('touchmove', (e) => { if (drag) e.preventDefault(); }, { passive: false });

    listEl.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      const row = rowFrom(e.target);
      if (!row) return;
      if (Date.now() - dragJustEnded < 350) return; // ignore the click a drag release can leave behind
      if (btn && !btn.disabled) {
        const act = btn.dataset.act;
        if (act === 'toggle') { Store.toggleTask(row.kind, row.key, row.id); App.refresh(); }
        else if (act === 'del') { Store.deleteTask(row.kind, row.key, row.id); App.refresh(); }
        else if (act === 'edit') openEdit(row);
        return;
      }
      if (row.li.querySelector('.check').disabled) return; // future = locked
      Store.toggleTask(row.kind, row.key, row.id);          // short tap anywhere = toggle
      App.refresh();
    });
  }

  return { render, init };
})();
