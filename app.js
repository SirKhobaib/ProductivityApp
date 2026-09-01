'use strict';

/* App shell: state, tab bar, date bar, progress card, radar, celebration. */
const App = (() => {
  const state = { viewKey: U.todayKey(), tab: 'home', taskTab: 'daily', motherTab: 'habits', fabOpen: false, progOpen: false };
  let lastToday = U.todayKey();

  /* ---------- theme / language / profile header ---------- */
  function applyTheme() {
    const theme = Store.getSetting('theme', 'light');
    document.body.dataset.theme = theme;
    if (theme === 'custom') {
      const fav = Store.getProfile().color || '#58CC02';
      document.body.style.setProperty('--accent', fav);
      document.body.style.setProperty('--accent-dark', fav);
    } else {
      document.body.style.removeProperty('--accent');
      document.body.style.removeProperty('--accent-dark');
    }
  }

  function applyLang() {
    I18N.setLang(Store.getSetting('lang', 'en'));
    document.documentElement.lang = I18N.get();
    document.documentElement.dir = I18N.isRTL() ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = T(el.getAttribute('data-i18n'));
    });
  }

  function initialsOf(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  }

  function renderHeader() {
    const p = Store.getProfile();
    const name = (p.name || '').trim();
    document.getElementById('profileName').textContent = name || T('defaultName');
    const img = document.getElementById('avatarImg');
    const init = document.getElementById('avatarInitials');
    if (p.image) { img.src = p.image; img.hidden = false; init.hidden = true; }
    else { img.hidden = true; img.removeAttribute('src'); init.textContent = initialsOf(name) || '?'; init.hidden = false; }
    document.getElementById('avatarBox').style.boxShadow = '0 0 0 2px ' + (p.color || 'var(--accent)');
  }

  const viewKey = () => state.viewKey;
  const taskTab = () => state.taskTab;
  const isToday = () => state.viewKey === U.todayKey();
  const isFuture = () => state.viewKey > U.todayKey();

  function setViewKey(k) { state.viewKey = k; state.progOpen = false; refresh(); }
  function setTaskTab(t) { state.taskTab = t; Tasks.render(); }

  function setTab(t) {
    closeFabMenu();
    state.tab = t;
    document.body.dataset.tab = t;
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + t));
    document.querySelectorAll('.tabbar .tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === t));
    if (t === 'reports') Reports.render();
    else if (t === 'streak') Streaks.render();
    else if (t === 'map') WorldMap.render();
    else if (t === 'settings') SettingsPage.render();
  }

  /* ---------- date bar ---------- */
  function renderDateBar() {
    document.getElementById('dateMain').textContent = U.fmtMain(state.viewKey);
    const parts = [];
    if (isToday()) parts.push('<span class="pill pill-today">' + T('today') + '</span>');
    else if (state.viewKey === U.addDaysKey(U.todayKey(), -1)) parts.push('<span class="pill pill-soft">' + T('yesterday') + '</span>');
    if (isFuture()) parts.push('<span class="pill pill-lock">' + T('readOnly') + '</span>');
    document.getElementById('dateSub').innerHTML = parts.join(' ');

    const banner = document.getElementById('readOnlyBanner');
    banner.hidden = !isFuture();
    if (isFuture()) banner.textContent = T('futureBanner');
  }

  /* ---------- progress card ---------- */
  function renderProgress() {
    const s = Store.dayStats(state.viewKey);
    const pct = Math.round(s.pct * 100);
    const fill = document.getElementById('progressFill');
    fill.style.width = pct + '%';
    document.getElementById('progressPct').textContent = I18N.num(pct) + '%';

    document.getElementById('progDetail').hidden = !state.progOpen;
    document.getElementById('progressToggle').setAttribute('aria-expanded', String(state.progOpen));

    document.getElementById('pbHabits').textContent = s.habitsTotal
      ? I18N.num(s.habitsDone) + '/' + I18N.num(s.habitsTotal) + ' ' + T('habits')
      : T('noHabits');
    document.getElementById('pbTasks').textContent = s.tTotal
      ? I18N.num(s.tDone) + '/' + I18N.num(s.tTotal) + ' ' + T('tasks')
      : T('nothingHere');

    const habits = Store.activeHabits();
    document.getElementById('pbHabitSegs').innerHTML = s.habitsTotal
      ? habits.map((h) => `<span class="seg" style="flex-grow:${Math.max(s.ratios[h.id], 0.04).toFixed(2)};background:${h.color}"></span>`).join('')
      : '<span class="seg-empty">' + T('noHabits') + '</span>';

    const tasks = Store.dailyTasks(state.viewKey);
    document.getElementById('pbTaskSegs').innerHTML = s.tTotal
      ? tasks.map((t) => `<span class="seg" style="flex-grow:1;background:${t.done ? 'var(--accent)' : 'var(--track)'}"></span>`).join('')
      : '<span class="seg-empty">' + T('nothingHere') + '</span>';
  }

  /* ---------- mother section (Habits | Tasks) & FAB quick menu ---------- */
  function setMotherTab(t) {
    state.motherTab = t;
    document.body.dataset.mother = t;
    document.querySelectorAll('#motherTabs button').forEach((b) => b.classList.toggle('active', b.dataset.mtab === t));
    if (t === 'tasks') Tasks.render();
  }

  function openFabMenu() {
    state.fabOpen = true;
    document.getElementById('fabMenu').hidden = false;
    document.getElementById('fabScrim').hidden = false;
  }

  function closeFabMenu() {
    state.fabOpen = false;
    document.getElementById('fabMenu').hidden = true;
    document.getElementById('fabScrim').hidden = true;
  }

  function toggleFabMenu() {
    if (state.fabOpen) closeFabMenu();
    else openFabMenu();
  }

  /* ---------- radar ---------- */
  function renderRadar() {
    if (state.tab !== 'home') return;
    const axes = Store.radarAxes(state.viewKey);
    Radar.render(document.getElementById('radarCanvas'), axes);
    const cats = new Set(Store.activeHabits().map((h) => h.category).filter(Boolean));
    document.getElementById('radarMode').textContent = cats.size >= 5
      ? T('radarTop')
      : ['Spiritual', 'Mind', 'Body', 'Work', 'Discipline'].map((c) => I18N.cat(c)).join(' \u00B7 ');
  }

  /* ---------- celebration (rare: only when a day hits 100%) ---------- */
  function confettiBurst() {
    const c = document.getElementById('confetti');
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth, H = window.innerHeight;
    c.width = W * dpr; c.height = H * dpr;
    c.style.width = W + 'px'; c.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.hidden = false;

    const accent = U.cssVar('--accent', '#58CC02');
    const accent2 = U.cssVar('--accent2', '#1CB0F6');
    const colors = [accent, accent2, accent];
    const parts = Array.from({ length: 90 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * 140,
      y: H * 0.32,
      vx: (Math.random() - 0.5) * 10,
      vy: -(Math.random() * 8 + 6),
      g: 0.28,
      s: Math.random() * 5 + 4,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.35,
      c: colors[Math.floor(Math.random() * colors.length)],
      life: 1
    }));

    let frame = 0;
    (function tick() {
      ctx.clearRect(0, 0, W, H);
      let alive = false;
      for (const p of parts) {
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= 0.012;
        if (p.life <= 0 || p.y > H + 20) continue;
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6));
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66);
        ctx.restore();
      }
      frame++;
      if (alive && frame < 140) requestAnimationFrame(tick);
      else { ctx.clearRect(0, 0, W, H); c.hidden = true; }
    })();
  }

  /* ---------- refresh: re-render everything after a data change ---------- */
  function refresh() {
    renderHeader();
    renderDateBar();
    renderProgress();
    Habits.render();
    Tasks.render();
    renderRadar();
    // Celebrate the first time today reaches 100% (never on past/future views).
    if (isToday()) {
      const s = Store.dayStats(state.viewKey);
      if (s.pct >= 0.999 && s.habitsTotal + s.tTotal > 0 && Store.markCelebrated(state.viewKey)) {
        confettiBurst();
      }
      // Streak milestones (7/30/100/365) — one-time celebration each.
      const m = Store.milestoneCheck();
      if (m) {
        confettiBurst();
        setTimeout(() => U.toast(T('milestoneToast', { n: m })), 700);
      }
    }
  }

  /* ---------- boot ---------- */
  function init() {
    Store.load();

    // Boot overrides (also used for testing): ?lang=fa&theme=dark&calendar=afghan&tour=1
    const qs = new URLSearchParams(location.search);
    if (qs.get('lang')) Store.setSetting('lang', qs.get('lang'));
    if (qs.get('theme')) Store.setSetting('theme', qs.get('theme'));
    if (qs.get('calendar')) Store.setSetting('calendar', qs.get('calendar'));
    if (qs.get('tour') === '1') Store.data.meta.tourDone = false;
    if (qs.get('ob') === '1') Store.data.meta.onboarded = false;
    if (qs.get('ob') === 'skip' || qs.get('tour') === 'skip') Store.markOnboarded();

    applyLang();
    applyTheme();
    Sheets.init();
    Habits.init();
    Tasks.init();
    Reports.init();
    Streaks.init();
    SettingsPage.init();
    WorldMap.init();

    document.getElementById('datePrev').addEventListener('click', () => setViewKey(U.addDaysKey(state.viewKey, -1)));
    document.getElementById('dateNext').addEventListener('click', () => setViewKey(U.addDaysKey(state.viewKey, 1)));
    document.getElementById('dateOpen').addEventListener('click', () =>
      Sheets.openCalendar(state.viewKey, (k) => setViewKey(k))
    );
    document.getElementById('progressToggle').addEventListener('click', () => {
      state.progOpen = !state.progOpen;
      renderProgress();
    });
    document.getElementById('fab').addEventListener('click', toggleFabMenu);
    document.getElementById('fabScrim').addEventListener('click', closeFabMenu);
    document.getElementById('fabNewHabit').addEventListener('click', () => { closeFabMenu(); Sheets.openHabitForm(null); });
    document.getElementById('fabNewTask').addEventListener('click', () => { closeFabMenu(); Sheets.openTaskSheet(); });
    document.getElementById('motherTabs').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-mtab]');
      if (b) setMotherTab(b.dataset.mtab);
    });

    document.querySelector('.tabbar').addEventListener('click', (e) => {
      const b = e.target.closest('.tab');
      if (b) setTab(b.dataset.tab);
    });

    // Settings is reached from the gear icon in the date bar (not a tab).
    document.getElementById('settingsBtn').addEventListener('click', () => setTab('settings'));
    document.getElementById('profileBtn').addEventListener('click', () => { setTab('settings'); SettingsPage.open('profile'); });

    // Day rollover: if the app stays open past midnight, snap forward.
    const checkMidnight = () => {
      const t = U.todayKey();
      if (t !== lastToday) {
        lastToday = t;
        if (state.viewKey === U.addDaysKey(t, -1)) state.viewKey = t;
        refresh();
      }
    };
    setInterval(checkMidnight, 20000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) checkMidnight(); });

    window.addEventListener('resize', U.debounce(() => {
      if (state.tab === 'home') renderRadar();
      else if (state.tab === 'reports') Reports.render();
      else if (state.tab === 'streak') Streaks.render();
      else if (state.tab === 'map') WorldMap.render();
    }, 150));

    // Deep-link support: index.html#reports, #streak, #map, #settings, #tasks
    const hash = location.hash.replace('#', '');
    if (hash === 'tasks') { setTab('home'); setMotherTab('tasks'); }
    else if (['map', 'reports', 'streak', 'settings'].indexOf(hash) >= 0) setTab(hash);
    else setTab('home');
    refresh();
    if (!Store.data.meta.onboarded) Onboard.start();
    else Tour.start();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { viewKey, taskTab, isToday, isFuture, setViewKey, setTaskTab, setTab, setMotherTab, refresh, init, applyTheme, applyLang, renderHeader };
})();
