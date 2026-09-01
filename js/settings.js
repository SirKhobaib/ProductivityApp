'use strict';

/* Settings: archived habits, restore by ID, streak goal, backup/restore, data. */
const SettingsPage = (() => {
  let activeTab = 'general';

  function open(tab) { showTab(tab || 'general'); }

  function showTab(tab) {
    activeTab = tab;
    document.querySelectorAll('#settingsTabs button').forEach((b) => b.classList.toggle('active', b.dataset.stab === tab));
    document.getElementById('set-general').hidden = tab !== 'general';
    document.getElementById('set-profile').hidden = tab !== 'profile';
    document.getElementById('set-interface').hidden = tab !== 'interface';
    render();
  }

  function render() {
    renderStaticLabels();
    renderArchived();
    renderGoal();
    renderCascade();
    renderDataStats();
    renderProfile();
    renderInterface();
  }

  function renderStaticLabels() {
    document.getElementById('eraseAllBtn').textContent = T('eraseAll');
    document.getElementById('loadSampleBtn').textContent = T('loadSample');
    document.getElementById('backupCopyBtn').textContent = T('copyAllBtn');
    document.getElementById('restoreApplyBtn').textContent = T('restoreJson');
    document.getElementById('restoreFindBtn').textContent = T('findBtn');
    document.getElementById('restoreId').placeholder = T('idPh');
    document.getElementById('restoreData').placeholder = T('pastePh');
  }

  function renderArchived() {
    const el = document.getElementById('archivedList');
    const list = Store.data.habits.filter((h) => h.archived)
      .sort((a, b) => (b.archivedAt || '').localeCompare(a.archivedAt || ''));
    if (!list.length) {
      el.innerHTML = '<p class="hint">' + T('archivedEmpty') + '</p>';
      return;
    }
    el.innerHTML = list.map((h) => `
      <div class="row-item" data-id="${h.id}">
        <div class="icon-chip sm" style="background:${U.rgba(h.color, 0.14)}">${h.icon}</div>
        <div class="row-main">
          <div class="row-name">${U.esc(h.name)}</div>
          <div class="row-sub">ID <code>${U.esc(h.id)}</code>${h.archivedAt ? ' \u00B7 ' + T('archivedLabel') + ' ' + U.fmtMain(h.archivedAt.slice(0, 10)) : ''}</div>
        </div>
        <div class="row-actions">
          <button class="btn ghost sm" data-act="restore" type="button">${T('restoreBtn')}</button>
          <button class="btn danger sm" data-act="delete" type="button">${T('deleteBtn')}</button>
        </div>
      </div>`).join('');
  }

  function onArchivedClick(e) {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const row = btn.closest('.row-item');
    if (!row) return;
    const id = row.dataset.id;
    if (btn.dataset.act === 'restore') {
      Store.restoreHabit(id);
      render(); App.refresh(); U.toast(T('restoredToast'));
    } else if (btn.dataset.act === 'delete') {
      if (btn.dataset.armed) {
        Store.deleteHabitForever(id);
        render(); App.refresh(); U.toast(T('deletedToast'));
      } else {
        btn.dataset.armed = '1';
        btn.textContent = T('reallyDelete');
      }
    }
  }

  function findAndShow() {
    const input = document.getElementById('restoreId');
    const out = document.getElementById('restoreResult');
    const raw = input.value.trim();
    if (!raw) { out.innerHTML = '<p class="hint">' + T('typeAnId') + '</p>'; return; }
    let h = Store.habitById(raw);
    if (!h) h = Store.data.habits.find((x) => x.id.toLowerCase() === raw.toLowerCase()) || null;
    if (!h) { out.innerHTML = '<p class="hint warn">' + T('notFoundMsg') + '</p>'; return; }
    if (!h.archived) {
      out.innerHTML = '<p class="hint ok"><b>' + U.esc(h.name) + '</b> ' + T('alreadyActiveMsg') + '</p>';
      return;
    }
    out.innerHTML = `
      <div class="row-item">
        <div class="icon-chip sm" style="background:${U.rgba(h.color, 0.14)}">${h.icon}</div>
        <div class="row-main">
          <div class="row-name">${U.esc(h.name)}</div>
          <div class="row-sub">ID <code>${U.esc(h.id)}</code> \u00B7 ${T('archivedLabel')}</div>
        </div>
        <div class="row-actions"><button class="btn primary sm" id="restoreByIdBtn" type="button">${T('restoreBtn')}</button></div>
      </div>`;
    document.getElementById('restoreByIdBtn').addEventListener('click', () => {
      Store.restoreHabit(h.id);
      input.value = '';
      out.innerHTML = '<p class="hint ok">' + T('restoredMsg') + '</p>';
      render(); App.refresh(); U.toast(T('restoredToast'));
    });
  }

  function renderGoal() {
    const g = Store.goalPct();
    document.querySelectorAll('#goalSeg button').forEach((b) =>
      b.classList.toggle('active', Number(b.dataset.goal) === g));
  }

  function renderCascade() {
    const on = Store.getSetting('cascadeTasks', true) !== false;
    const sw = document.getElementById('cascadeSwitch');
    sw.classList.toggle('on', on);
    sw.setAttribute('aria-checked', String(on));
  }

  function initialsOf(name) {
    return String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  }

  function renderProfile() {
    const p = Store.getProfile();
    document.getElementById('pfName').value = p.name || '';
    document.getElementById('pfTitle').value = p.title || '';
    document.getElementById('pfUsername').value = p.username || '';
    document.getElementById('pfBio').value = p.bio || '';
    const img = document.getElementById('pfAvatarImg');
    const init = document.getElementById('pfAvatarInit');
    if (p.image) { img.src = p.image; img.hidden = false; init.hidden = true; }
    else { img.hidden = true; init.textContent = initialsOf(p.name) || '?'; init.hidden = false; }
    document.getElementById('pfAvatar').style.boxShadow = '0 0 0 2px ' + (p.color || 'var(--accent)');
    document.getElementById('pfRemoveBtn').hidden = !p.image;
    const fav = p.color || '';
    document.getElementById('pfColors').innerHTML = PALETTE.map((c) =>
      `<button type="button" class="pick-color${c === fav ? ' sel' : ''}" data-color="${c}" style="background:${c}" aria-label="${c}"></button>`).join('');
  }

  function renderInterface() {
    const theme = Store.getSetting('theme', 'light');
    document.querySelectorAll('#themeSeg button').forEach((b) => b.classList.toggle('active', b.dataset.themeOpt === theme));
    const lang = Store.getSetting('lang', 'en');
    document.querySelectorAll('#langSeg button').forEach((b) => b.classList.toggle('active', b.dataset.lang === lang));
    const cal = Store.getSetting('calendar', 'iran');
    document.querySelectorAll('#calSeg button').forEach((b) => b.classList.toggle('active', b.dataset.cal === cal));
  }

  function backupCopy() {
    const json = JSON.stringify(Store.data);
    const ta = document.getElementById('restoreData');
    const fallback = () => { ta.value = json; ta.select(); U.toast(T('copyFallback')); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(json).then(() => U.toast(T('copied'))).catch(fallback);
    } else fallback();
  }

  let armedRestore = false;
  function applyRestore() {
    const btn = document.getElementById('restoreApplyBtn');
    const ta = document.getElementById('restoreData');
    if (!armedRestore) {
      armedRestore = true;
      btn.textContent = T('confirmRestore');
      setTimeout(() => { armedRestore = false; btn.textContent = T('restoreJson'); }, 4000);
      return;
    }
    try {
      Store.importData(JSON.parse(ta.value));
      armedRestore = false;
      btn.textContent = T('restoreJson');
      ta.value = '';
      render(); App.refresh();
      U.toast(T('backupRestored'));
    } catch (err) {
      U.toast(T('invalidBackup'));
    }
  }

  function renderDataStats() {
    const d = Store.data;
    const size = JSON.stringify(d).length;
    const archived = d.habits.filter((h) => h.archived).length;
    document.getElementById('dataStats').innerHTML = `
      <div class="data-line"><span>${T('habits')}</span><b>${T('habitsStat', { a: I18N.num(d.habits.length - archived), b: I18N.num(archived) })}</b></div>
      <div class="data-line"><span>${T('daysStat')}</span><b>${I18N.num(Object.keys(d.days).length)}</b></div>
      <div class="data-line"><span>${T('storageStat')}</span><b>${I18N.num((size / 1024).toFixed(1))} KB</b></div>
      <div class="data-line"><span>${T('schemaStat')}</span><b>v${I18N.num(d.schemaVersion)}</b></div>`;
  }

  let armedErase = false;
  function eraseAll() {
    const btn = document.getElementById('eraseAllBtn');
    if (!armedErase) {
      armedErase = true;
      btn.textContent = T('confirmErase');
      setTimeout(() => { armedErase = false; btn.textContent = T('eraseAll'); }, 4000);
      return;
    }
    armedErase = false;
    btn.textContent = T('eraseAll');
    Store.eraseAll();
    render(); App.refresh();
    U.toast(T('allErased'));
  }

  function loadSample() {
    Store.loadSample();
    render(); App.refresh();
    U.toast(T('sampleLoaded'));
  }

  function init() {
    document.getElementById('settingsBack').addEventListener('click', () => App.setTab('home'));
    document.getElementById('settingsTabs').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-stab]');
      if (b) showTab(b.dataset.stab);
    });
    document.getElementById('archivedList').addEventListener('click', onArchivedClick);
    document.getElementById('restoreFindBtn').addEventListener('click', findAndShow);
    document.getElementById('restoreId').addEventListener('keydown', (e) => { if (e.key === 'Enter') findAndShow(); });
    document.getElementById('goalSeg').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-goal]');
      if (!b) return;
      Store.setSetting('goalPct', Number(b.dataset.goal));
      renderGoal();
      App.refresh();
      U.toast(T('goalSet', { p: I18N.num(b.dataset.goal) }));
    });
    document.getElementById('cascadeSwitch').addEventListener('click', () => {
      const next = Store.getSetting('cascadeTasks', true) === false; // currently off -> turning on
      Store.setSetting('cascadeTasks', next);
      renderCascade();
      App.refresh();
      U.toast(next ? T('cascadeOn') : T('cascadeOff'));
    });
    document.getElementById('backupCopyBtn').addEventListener('click', backupCopy);
    document.getElementById('restoreApplyBtn').addEventListener('click', applyRestore);
    document.getElementById('eraseAllBtn').addEventListener('click', eraseAll);
    document.getElementById('loadSampleBtn').addEventListener('click', loadSample);

    // profile
    document.getElementById('pfSave').addEventListener('click', () => {
      Store.setProfile({
        name: document.getElementById('pfName').value.trim(),
        title: document.getElementById('pfTitle').value.trim(),
        username: document.getElementById('pfUsername').value.trim(),
        bio: document.getElementById('pfBio').value.trim()
      });
      renderProfile(); App.renderHeader(); U.toast(T('profileSaved'));
    });
    document.getElementById('pfColors').addEventListener('click', (e) => {
      const b = e.target.closest('.pick-color');
      if (!b) return;
      Store.setProfile({ color: b.dataset.color });
      renderProfile(); App.applyTheme(); App.renderHeader();
    });
    document.getElementById('pfRemoveBtn').addEventListener('click', () => {
      Store.setProfile({ image: null });
      renderProfile(); App.renderHeader();
    });
    document.getElementById('pfImgInput').addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        const im = new Image();
        im.onload = () => {
          const size = 256;
          const canvas = document.createElement('canvas');
          canvas.width = size; canvas.height = size;
          const ctx = canvas.getContext('2d');
          const s = Math.min(im.width, im.height);
          ctx.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, size, size);
          Store.setProfile({ image: canvas.toDataURL('image/jpeg', 0.85) });
          renderProfile(); App.renderHeader();
          U.toast(T('profileSaved'));
        };
        im.src = reader.result;
      };
      reader.readAsDataURL(f);
      e.target.value = '';
    });

    // interface
    document.getElementById('themeSeg').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-theme-opt]');
      if (!b) return;
      Store.setSetting('theme', b.dataset.themeOpt);
      App.applyTheme(); renderInterface();
    });
    document.getElementById('langSeg').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-lang]');
      if (!b) return;
      Store.setSetting('lang', b.dataset.lang);
      App.applyLang(); App.applyTheme();
      render(); App.refresh(); App.renderHeader();
    });
    document.getElementById('calSeg').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-cal]');
      if (!b) return;
      Store.setSetting('calendar', b.dataset.cal);
      renderInterface();
      App.refresh();
    });
  }

  return { render, init, open };
})();
