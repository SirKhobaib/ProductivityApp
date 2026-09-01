'use strict';

/* Bottom sheets: calendar picker, day note, add/edit habit form.
   One sheet at a time; quick 260ms slide-up, tap backdrop or Esc to dismiss. */
const Sheets = (() => {
  let root, backdrop, bodyEl;

  function init() {
    root = document.getElementById('sheetRoot');
    backdrop = document.getElementById('sheetBackdrop');
    bodyEl = document.getElementById('sheetBody');
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !root.hidden) close(); });
  }

  function open(build) {
    bodyEl.innerHTML = '';
    build(bodyEl);
    root.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('open')));
    const f = bodyEl.querySelector('input:not([disabled]), textarea:not([disabled])');
    if (f) setTimeout(() => f.focus(), 280);
  }

  function close() {
    if (root.hidden) return;
    root.classList.remove('open');
    setTimeout(() => { root.hidden = true; bodyEl.innerHTML = ''; }, 250);
  }

  function mkBtn(text, cls, label) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.textContent = text;
    if (label) b.setAttribute('aria-label', label);
    return b;
  }

  /* ---------- calendar picker (Gregorian EN / Jalali FA) ---------- */
  function openCalendar(selKey, onPick) {
    if (I18N.isRTL()) return openCalendarJalali(selKey, onPick);
    const cursor = U.keyToDate(selKey);
    cursor.setDate(1);
    open((el) => {
      el.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = 'cal';

      const head = document.createElement('div');
      head.className = 'cal-head';
      const prev = mkBtn('\u2039', 'cal-nav', T('prevMonth'));
      const next = mkBtn('\u203A', 'cal-nav', T('nextMonth'));
      const title = document.createElement('div');
      title.className = 'cal-title';
      head.append(prev, title, next);

      const grid = document.createElement('div');
      grid.className = 'cal-grid';

      function drawMonth() {
        title.textContent = U.fmtMonthYear(cursor);
        grid.innerHTML = '';
        for (const ch of 'SMTWTFS') {
          const d = document.createElement('div');
          d.className = 'cal-dow';
          d.textContent = ch;
          grid.appendChild(d);
        }
        const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
        for (let i = 0; i < first.getDay(); i++) grid.appendChild(document.createElement('div'));
        const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
        const tk = U.todayKey();
        for (let day = 1; day <= daysInMonth; day++) {
          const k = U.dateKey(new Date(cursor.getFullYear(), cursor.getMonth(), day));
          const b = mkBtn(String(day), 'cal-day');
          if (k === tk) b.classList.add('today');
          if (k === selKey) b.classList.add('selected');
          const rec = Store.peekDay(k);
          if (rec && (Object.keys(rec.habits).length || rec.tasks.length)) b.classList.add('has-data');
          b.addEventListener('click', () => { close(); onPick(k); });
          grid.appendChild(b);
        }
      }
      prev.addEventListener('click', () => { cursor.setMonth(cursor.getMonth() - 1); drawMonth(); });
      next.addEventListener('click', () => { cursor.setMonth(cursor.getMonth() + 1); drawMonth(); });

      wrap.append(head, grid);
      el.appendChild(wrap);
      drawMonth();
    });
  }

  function openCalendarJalali(selKey, onPick) {
    const calKind = Store.getSetting('calendar', 'iran');
    const sel = Jalali.toJalali(U.keyToDate(selKey));
    let jy = sel[0], jm = sel[1];
    open((el) => {
      el.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = 'cal';

      const head = document.createElement('div');
      head.className = 'cal-head';
      const prev = mkBtn('\u2039', 'cal-nav', T('prevMonth'));
      const next = mkBtn('\u203A', 'cal-nav', T('nextMonth'));
      const title = document.createElement('div');
      title.className = 'cal-title';
      head.append(prev, title, next);

      const grid = document.createElement('div');
      grid.className = 'cal-grid';

      function drawMonth() {
        title.textContent = `${Jalali.monthNames(calKind)[jm - 1]} ${I18N.num(jy)}`;
        grid.innerHTML = '';
        for (const ch of Jalali.DOW_MIN) {
          const d = document.createElement('div');
          d.className = 'cal-dow';
          d.textContent = ch;
          grid.appendChild(d);
        }
        const first = Jalali.fromJalali(jy, jm, 1);
        const lead = (first.getDay() + 1) % 7; // Persian weeks start on Saturday
        for (let i = 0; i < lead; i++) grid.appendChild(document.createElement('div'));
        const len = Jalali.monthLength(jy, jm);
        const tk = U.todayKey();
        for (let day = 1; day <= len; day++) {
          const k = U.dateKey(Jalali.fromJalali(jy, jm, day));
          const b = mkBtn(I18N.num(day), 'cal-day');
          if (k === tk) b.classList.add('today');
          if (k === selKey) b.classList.add('selected');
          const rec = Store.peekDay(k);
          if (rec && (Object.keys(rec.habits).length || rec.tasks.length)) b.classList.add('has-data');
          b.addEventListener('click', () => { close(); onPick(k); });
          grid.appendChild(b);
        }
      }
      prev.addEventListener('click', () => { jm--; if (jm < 1) { jm = 12; jy--; } drawMonth(); });
      next.addEventListener('click', () => { jm++; if (jm > 12) { jm = 1; jy++; } drawMonth(); });

      wrap.append(head, grid);
      el.appendChild(wrap);
      drawMonth();
    });
  }

  /* ---------- day note (long-press on a habit card) ---------- */
  function openNote(habitId, dateKey) {
    const h = Store.habitById(habitId);
    if (!h) return;
    const e = Store.entryFor(dateKey, habitId);
    const future = dateKey > U.todayKey();
    open((el) => {
      el.innerHTML = `
        <h3 class="sheet-title">${h.icon} ${U.esc(h.name)}
          <span class="sheet-sub">${U.fmtFull(dateKey)}</span>
        </h3>
        <textarea id="noteArea" class="note-area" rows="5" maxlength="2000"
          placeholder="${T('notePh')}"${future ? ' disabled' : ''}>${e && e.note ? U.esc(e.note) : ''}</textarea>
        <div class="sheet-actions">
          ${e && e.note ? `<button type="button" class="btn ghost" id="noteClear">${T('clearNote')}</button>` : ''}
          <button type="button" class="btn primary" id="noteSave"${future ? ' disabled' : ''}>${T('saveNote')}</button>
        </div>
        ${future ? `<p class="sheet-note">${T('noteFuture')}</p>` : ''}`;
      el.querySelector('#noteSave').addEventListener('click', () => {
        Store.setNote(dateKey, habitId, el.querySelector('#noteArea').value.trim());
        close(); App.refresh(); U.toast(T('noteSaved'));
      });
      const clr = el.querySelector('#noteClear');
      if (clr) clr.addEventListener('click', () => {
        Store.setNote(dateKey, habitId, '');
        close(); App.refresh(); U.toast(T('noteCleared'));
      });
    });
  }

  /* ---------- add / edit habit form ---------- */
  function openHabitForm(habitId) {
    const editing = !!habitId;
    const h = editing ? Store.habitById(habitId) : null;
    const cats = Store.categories();
    const st = {
      name: h ? h.name : '',
      unit: h ? h.unit : 'pages',
      customUnit: h ? (h.customUnit || '') : '',
      target: h ? h.target : 1,
      effortMin: h ? Store.effortPerUnit(h) : Store.unitEffort('pages'),
      category: h ? h.category : 'Mind',
      icon: h ? h.icon : ICONS[0],
      color: h ? h.color : PALETTE[0],
      subtasks: h ? h.subtasks.map((s) => ({ id: s.id, title: s.title })) : []
    };
    const isCustomCat = !!(st.category && !cats.includes(st.category));

    open((el) => {
      el.innerHTML = `
        <h3 class="sheet-title">${editing ? T('editHabit') : T('newHabit')}${editing
          ? `<span class="sheet-sub">ID <code>${U.esc(h.id)}</code> — ${T('idLine')}</span>` : ''}</h3>
        <div class="field">
          <label for="hfName">${T('fieldName')}</label>
          <input id="hfName" type="text" maxlength="60" placeholder="${T('phName')}" value="${U.esc(st.name)}" />
        </div>
        <div class="field-row">
          <div class="field">
            <label for="hfUnit">${T('fieldUnit')}</label>
            <select id="hfUnit">${UNITS.map((u) => `<option value="${u}"${u === st.unit ? ' selected' : ''}>${u === 'custom' ? T('unitCustom') : T('unit' + u[0].toUpperCase() + u.slice(1))}</option>`).join('')}</select>
          </div>
          <div class="field">
            <label for="hfTarget">${T('fieldTarget')}</label>
            <input id="hfTarget" type="number" min="0.5" step="any" value="${U.fmtNum(st.target)}" />
          </div>
        </div>
        <div class="field" id="hfCustomWrap"${st.unit === 'custom' ? '' : ' hidden'}>
          <label for="hfCustomUnit">${T('fieldCustomUnit')}</label>
          <input id="hfCustomUnit" type="text" maxlength="16" placeholder="${T('phCustomUnit')}" value="${U.esc(st.customUnit)}" />
        </div>
        <div class="field">
          <label for="hfEffort">${T('fieldEffort')}</label>
          <input id="hfEffort" type="number" min="1" step="1" value="${U.fmtNum(st.effortMin)}" />
          <p class="hint" style="margin:6px 0 0">${T('effortHint')}</p>
        </div>
        <div class="field">
          <label for="hfCat">${T('fieldCategory')}</label>
          <select id="hfCat">${cats.map((c) => `<option value="${U.esc(c)}"${c === st.category ? ' selected' : ''}>${U.esc(I18N.cat(c))}</option>`).join('')}<option value="__custom"${isCustomCat ? ' selected' : ''}>${T('unitCustom')}</option></select>
        </div>
        <div class="field" id="hfCustomCatWrap"${isCustomCat ? '' : ' hidden'}>
          <label for="hfCustomCat">${T('fieldCategory')}</label>
          <input id="hfCustomCat" type="text" maxlength="24" value="${isCustomCat ? U.esc(st.category) : ''}" />
        </div>
        <div class="field">
          <label>${T('fieldIcon')}</label>
          <div class="pick-row" id="hfIcons">${ICONS.map((i) => `<button type="button" class="pick-icon${i === st.icon ? ' sel' : ''}" data-icon="${i}">${i}</button>`).join('')}</div>
        </div>
        <div class="field">
          <label>${T('fieldColor')}</label>
          <div class="pick-row" id="hfColors">${PALETTE.map((c) => `<button type="button" class="pick-color${c === st.color ? ' sel' : ''}" data-color="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div>
        </div>
        <div class="field">
          <label>${T('fieldSubtasks')} <span class="label-soft">${T('subtaskOpt')}</span></label>
          <div id="hfSubs"></div>
          <button type="button" class="btn ghost small" id="hfAddSub">${T('addSubtask')}</button>
        </div>
        <div class="sheet-actions">
          ${editing ? `<button type="button" class="btn danger" id="hfDelete">${T('archiveHabit')}</button>` : ''}
          <button type="button" class="btn primary" id="hfSave">${editing ? T('saveChanges') : T('createHabit')}</button>
        </div>
        ${editing ? `<p class="sheet-note">${T('archiveNote')}</p>` : ''}
      `;
      bindHabitForm(el, editing, h, st);
    });
  }

  function bindHabitForm(el, editing, h, st) {
    const nameEl = el.querySelector('#hfName');
    const targetEl = el.querySelector('#hfTarget');
    const unitEl = el.querySelector('#hfUnit');
    const customEl = el.querySelector('#hfCustomUnit');
    const catEl = el.querySelector('#hfCat');
    const customCatEl = el.querySelector('#hfCustomCat');
    const effortEl = el.querySelector('#hfEffort');

    unitEl.addEventListener('change', () => {
      el.querySelector('#hfCustomWrap').hidden = unitEl.value !== 'custom';
      st.effortMin = Store.unitEffort(unitEl.value);
      effortEl.value = U.fmtNum(st.effortMin);
    });
    catEl.addEventListener('change', () => {
      el.querySelector('#hfCustomCatWrap').hidden = catEl.value !== '__custom';
    });

    el.querySelector('#hfIcons').addEventListener('click', (ev) => {
      const b = ev.target.closest('.pick-icon');
      if (!b) return;
      st.icon = b.dataset.icon;
      el.querySelectorAll('.pick-icon').forEach((x) => x.classList.toggle('sel', x === b));
    });
    el.querySelector('#hfColors').addEventListener('click', (ev) => {
      const b = ev.target.closest('.pick-color');
      if (!b) return;
      st.color = b.dataset.color;
      el.querySelectorAll('.pick-color').forEach((x) => x.classList.toggle('sel', x === b));
    });

    const subsEl = el.querySelector('#hfSubs');
    function drawSubs() {
      subsEl.innerHTML = '';
      st.subtasks.forEach((s, idx) => {
        const row = document.createElement('div');
        row.className = 'sub-row';
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.maxLength = 60;
        inp.placeholder = T('fieldSubtasks') + ' ' + I18N.num(idx + 1);
        inp.value = s.title;
        inp.addEventListener('input', () => { s.title = inp.value; });
        const rm = mkBtn('\u00D7', 'sub-rm', T('deleteBtn'));
        rm.addEventListener('click', () => { st.subtasks.splice(idx, 1); drawSubs(); });
        row.append(inp, rm);
        subsEl.appendChild(row);
      });
    }
    el.querySelector('#hfAddSub').addEventListener('click', () => {
      st.subtasks.push({ id: null, title: '' });
      drawSubs();
      const rows = subsEl.querySelectorAll('input');
      if (rows.length) rows[rows.length - 1].focus();
    });
    drawSubs();

    el.querySelector('#hfSave').addEventListener('click', () => {
      const name = nameEl.value.trim();
      const target = parseFloat(targetEl.value);
      if (!name) { nameEl.classList.add('invalid'); nameEl.focus(); U.toast(T('needName')); return; }
      if (!(target > 0)) { targetEl.classList.add('invalid'); targetEl.focus(); U.toast(T('needTarget')); return; }
      let category = catEl.value;
      if (category === '__custom') {
        category = customCatEl.value.trim();
        if (!category) { customCatEl.classList.add('invalid'); customCatEl.focus(); U.toast(T('fieldName')); return; }
        Store.addCategory(category);
      }
      const patch = {
        name: name,
        unit: unitEl.value,
        customUnit: unitEl.value === 'custom' ? customEl.value.trim() : '',
        target: target,
        effortMin: Math.max(1, parseFloat(effortEl.value) || st.effortMin || 1),
        category: category,
        icon: st.icon,
        color: st.color,
        subtasks: st.subtasks
          .map((s) => ({ id: s.id || U.uid('s'), title: s.title.trim() }))
          .filter((s) => s.title)
      };
      if (editing) { Store.updateHabit(h.id, patch); U.toast(T('habitUpdated')); }
      else { Store.addHabit(patch); U.toast(T('habitAdded')); }
      close(); App.refresh();
    });

    // Two-tap confirm for archiving (soft delete) — history is preserved.
    const del = el.querySelector('#hfDelete');
    if (del) del.addEventListener('click', () => {
      if (del.dataset.armed) {
        Store.archiveHabit(h.id);
        close(); App.refresh(); U.toast(T('habitArchived'));
      } else {
        del.dataset.armed = '1';
        del.textContent = T('confirmArchive');
      }
    });
  }

  /* ---------- add / edit task (full form, from the + menu or a task row) ---------- */
  function openTaskSheet(existing, kind0, key0) {
    const editing = !!existing;
    const it = existing || {};
    let scope = editing ? kind0 : 'daily';
    const catOpts = `<option value="">${T('noCat')}</option>` +
      Store.categories().map((c) => `<option value="${U.esc(c)}"${c === it.cat ? ' selected' : ''}>${U.esc(I18N.cat(c))}</option>`).join('');
    open((el) => {
      el.innerHTML = `
        <h3 class="sheet-title">${editing ? T('editTask') : T('newTask')}</h3>
        ${editing ? '' : `
        <div class="seg sheet-seg" id="tsScope">
          <button type="button" data-scope="daily" class="active">${T('daily')}</button>
          <button type="button" data-scope="weekly">${T('weekly')}</button>
          <button type="button" data-scope="monthly">${T('monthly')}</button>
        </div>`}
        <div class="field">
          <input id="tsTitle" type="text" maxlength="120" placeholder="${T('phTask')}" value="${U.esc(it.title || '')}" />
        </div>
        <div class="field-row">
          <div class="field">
            <label for="tsDoer">${T('taskDoer')} <span class="label-soft">${T('optSuffix')}</span></label>
            <input id="tsDoer" type="text" maxlength="40" placeholder="${T('phDoer')}" value="${U.esc(it.doer || '')}" />
          </div>
          <div class="field">
            <label for="tsCat">${T('fieldTaskCat')}</label>
            <select id="tsCat">${catOpts}</select>
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="tsStart">${T('taskStart')}</label>
            <input id="tsStart" type="date" value="${U.esc(it.start || '')}" />
          </div>
          <div class="field">
            <label for="tsStartTime">${T('taskTime')} <span class="label-soft">${T('optSuffix')}</span></label>
            <input id="tsStartTime" type="time" value="${U.esc(it.startTime || '')}"${it.start ? '' : ' disabled'} />
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="tsDue">${T('taskDue')}</label>
            <input id="tsDue" type="date" value="${U.esc(it.due || '')}" />
          </div>
          <div class="field">
            <label for="tsDueTime">${T('taskTime')} <span class="label-soft">${T('optSuffix')}</span></label>
            <input id="tsDueTime" type="time" value="${U.esc(it.dueTime || '')}"${it.due ? '' : ' disabled'} />
          </div>
        </div>
        <div class="field">
          <label for="tsPlace">${T('taskPlace')} <span class="label-soft">${T('optSuffix')}</span></label>
          <input id="tsPlace" type="text" maxlength="160" placeholder="${T('phPlace')}" value="${U.esc(it.place || '')}" />
        </div>
        <div class="field">
          <label for="tsNote">${T('taskNote')} <span class="label-soft">${T('optSuffix')}</span></label>
          <textarea id="tsNote" rows="2" maxlength="500" placeholder="${T('phTaskNote')}">${U.esc(it.note || '')}</textarea>
        </div>
        <div class="sheet-actions td-actions">
          ${editing ? `<button type="button" class="btn ghost sq" id="tsUp" aria-label="${T('moveUp')}">\u2191</button>
          <button type="button" class="btn ghost sq" id="tsDown" aria-label="${T('moveDown')}">\u2193</button>` : ''}
          <button type="button" class="btn primary" id="tsAdd">${editing ? T('saveChanges') : T('addTaskBtn')}</button>
        </div>`;
      el.querySelector('#tsScope').addEventListener('click', (ev) => {
        const b = ev.target.closest('button[data-scope]');
        if (!b) return;
        scope = b.dataset.scope;
        el.querySelectorAll('#tsScope button').forEach((x) => x.classList.toggle('active', x === b));
      });
      // A time only makes sense with a date — disable it until a date is picked.
      const startEl = el.querySelector('#tsStart');
      const dueEl = el.querySelector('#tsDue');
      const startTimeEl = el.querySelector('#tsStartTime');
      const dueTimeEl = el.querySelector('#tsDueTime');
      startEl.addEventListener('change', () => {
        startTimeEl.disabled = !startEl.value;
        if (!startEl.value) startTimeEl.value = '';
      });
      dueEl.addEventListener('change', () => {
        dueTimeEl.disabled = !dueEl.value;
        if (!dueEl.value) dueTimeEl.value = '';
      });
      // Keyboard/screen-reader alternative to drag-reordering.
      if (editing) {
        el.querySelector('#tsUp').addEventListener('click', () => {
          Store.moveTask(kind0, key0, it.id, -1); App.refresh(); U.toast(T('taskMoved'));
        });
        el.querySelector('#tsDown').addEventListener('click', () => {
          Store.moveTask(kind0, key0, it.id, 1); App.refresh(); U.toast(T('taskMoved'));
        });
      }
      const save = () => {
        const title = el.querySelector('#tsTitle').value.trim();
        if (!title) { el.querySelector('#tsTitle').focus(); U.toast(T('typeFirst')); return; }
        const patch = {
          title,
          doer: el.querySelector('#tsDoer').value.trim(),
          cat: el.querySelector('#tsCat').value || null,
          start: el.querySelector('#tsStart').value || '',
          startTime: el.querySelector('#tsStartTime').value || '',
          due: el.querySelector('#tsDue').value || '',
          dueTime: el.querySelector('#tsDueTime').value || '',
          place: el.querySelector('#tsPlace').value.trim(),
          note: el.querySelector('#tsNote').value.trim()
        };
        if (editing) {
          Store.updateTask(kind0, key0, it.id, patch);
          close(); App.refresh(); U.toast(T('taskUpdated'));
        } else {
          const today = U.todayKey();
          const key = scope === 'weekly' ? U.isoWeekKey(today) : scope === 'monthly' ? U.monthKey(today) : today;
          Store.addTask(scope, key, patch.title, patch.cat, patch);
          close();
          App.setTaskTab(scope);
          App.setMotherTab('tasks');
          App.refresh();
          U.toast(T('taskAdded'));
        }
      };
      el.querySelector('#tsAdd').addEventListener('click', save);
      el.querySelector('#tsTitle').addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
    });
  }

  return { init, open, close, openCalendar, openNote, openHabitForm, openTaskSheet };
})();
