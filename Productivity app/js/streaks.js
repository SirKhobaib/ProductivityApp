'use strict';

/* Streak page: current/longest streak, milestone badges, 13-week heatmap. */
const Streaks = (() => {
  const WEEKS = 13;
  const FLAME_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c.6 2.6 2.7 4.2 3.9 6.2 1.2 2 1.5 4.4.2 6.6A6.5 6.5 0 0 1 5.5 13c0-2.4 1.3-4 2.5-5.7.5 1 1 1.8 2 2.3C10 7 10.6 4.6 12 3z"/></svg>';

  function render() {
    const info = Store.streakInfo();
    const ms = Store.milestones();

    document.getElementById('streakHero').innerHTML = `
      <div class="flame">${FLAME_SVG}</div>
      <div class="streak-count"><b>${I18N.num(info.current)}</b><span>${T('dayStreak')}</span></div>
      <div class="streak-goal">${T('goalLine', { p: I18N.num(info.goalPct), l: I18N.num(info.longest), m: I18N.num(info.next || '\u2014') })}</div>
      <div class="badges">
        ${[7, 30, 100, 365].map((m) => `
          <div class="badge${ms[m] ? ' earned' : ''}">
            <span class="badge-circle">${I18N.num(m)}</span>
            <span class="badge-date">${ms[m] ? U.fmtMain(ms[m]) : T('lockedBadge')}</span>
          </div>`).join('')}
      </div>`;

    const start = U.mondayOf(U.addDaysKey(U.todayKey(), -(WEEKS - 1) * 7));
    const days = [];
    for (let i = 0; i < WEEKS * 7; i++) {
      const key = U.addDaysKey(start, i);
      const logged = !!Store.peekDay(key);
      days.push({
        key: key,
        col: Math.floor(i / 7),
        row: i % 7,
        value: logged ? Store.dayStats(key).pct : null
      });
    }
    Charts.heatmap(document.getElementById('streakHeatmap'), days, WEEKS);

    const habits = Store.activeHabits();
    document.getElementById('streakHabits').innerHTML = habits.map((h) => {
      const st = Store.habitStreak(h.id);
      return `
      <div class="hstat">
        <div class="icon-chip sm" style="background:${U.rgba(h.color, 0.14)}">${h.icon}</div>
        <div class="hstat-main">
          <div class="hstat-name">${U.esc(h.name)}</div>
          <div class="hstat-sub">${T('best', { n: I18N.num(st.longest) })}</div>
        </div>
        <div class="hstat-pct flame-pct">${st.current ? '\u{1F525} ' + I18N.num(st.current) : '\u2014'}</div>
      </div>`;
    }).join('') || '<p class="hint">' + T('noHabits') + '</p>';
  }

  function init() { /* static page — rendered on tab activation */ }

  return { render, init, FLAME_SVG };
})();
