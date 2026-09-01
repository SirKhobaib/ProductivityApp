'use strict';

/* Reports: completion stats over Week / Month / 30-day ranges. Pure reads. */
const Reports = (() => {
  let range = 'week'; // 'week' | 'month' | '30'

  function rangeSpec() {
    const today = U.todayKey();
    if (range === 'year') return { from: U.addDaysKey(today, -364), to: today };
    if (range === 'month') {
      const d = U.keyToDate(today);
      return { from: U.dateKey(new Date(d.getFullYear(), d.getMonth(), 1)), to: today };
    }
    return { from: U.addDaysKey(today, -6), to: today };
  }

  function render() {
    document.querySelectorAll('#reportRange button').forEach((b) =>
      b.classList.toggle('active', b.dataset.range === range));

    const spec = rangeSpec();
    const stats = [];
    for (let k = spec.from; ; k = U.addDaysKey(k, 1)) {
      stats.push({ key: k, s: Store.dayStats(k), logged: !!Store.peekDay(k) });
      if (k >= spec.to) break;
    }
    const n = stats.length;
    const avg = stats.reduce((a, x) => a + x.s.pct, 0) / n;
    const logged = stats.filter((x) => x.logged).length;
    const perfect = stats.filter((x) => x.s.pct >= 0.999).length;

    document.getElementById('reportHero').innerHTML = `
      <div class="stat-big">
        <span class="stat-num" style="color:${U.progressColor(avg)}">${I18N.num(Math.round(avg * 100))}%</span>
        <span class="stat-label">${T('avgDay')}</span>
      </div>
      <div class="stat-side">
        <div class="stat-item"><b>${I18N.num(logged)}</b><span>${T('daysLogged')}</span></div>
        <div class="stat-item"><b>${I18N.num(perfect)}</b><span>${T('perfectDays')}</span></div>
      </div>`;

    let chartVals;
    if (range === 'year') {
      // 365 daily bars would be unreadable — aggregate to weekly averages.
      const buckets = [];
      let cur = null;
      stats.forEach((x) => {
        const wk = U.isoWeekKey(x.key);
        if (!cur || cur.wk !== wk) {
          if (cur) buckets.push(cur);
          cur = { wk: wk, monday: U.mondayOf(x.key), sum: 0, cnt: 0 };
        }
        cur.sum += x.s.pct;
        cur.cnt++;
      });
      if (cur) buckets.push(cur);
      chartVals = buckets.map((b, i) => ({
        label: U.fmtDayShort(b.monday),
        value: b.sum / b.cnt,
        highlight: i === buckets.length - 1
      }));
    } else {
      chartVals = stats.map((x) => ({
        label: String(U.keyToDate(x.key).getDate()),
        value: x.s.pct,
        highlight: x.key === U.todayKey()
      }));
    }
    Charts.bars(document.getElementById('reportBars'), chartVals);

    // category chips (reuse the radar grouping)
    const habits = Store.activeHabits();
    const cats = [];
    habits.forEach((h) => { if (h.category && !cats.includes(h.category)) cats.push(h.category); });
    document.getElementById('reportCats').innerHTML = cats.map((c) => {
      const hs = habits.filter((h) => h.category === c);
      let sum = 0;
      hs.forEach((h) => {
        stats.forEach((x) => { sum += Store.habitRatio(h, Store.entryFor(x.key, h.id)); });
      });
      const v = hs.length ? sum / (hs.length * n) : 0;
      return `<span class="cat-chip" style="background:${U.rgba(hs[0].color, 0.12)};color:${hs[0].color}">${U.esc(I18N.cat(c))} ${I18N.num(Math.round(v * 100))}%</span>`;
    }).join('');

    document.getElementById('reportHabits').innerHTML = habits.map((h) => {
      let full = 0, vol = 0;
      stats.forEach((x) => {
        const e = Store.entryFor(x.key, h.id);
        if (Store.habitRatio(h, e) >= 0.999) full++;
        if (e) vol += (e.v || 0);
      });
      const st = Store.habitStreak(h.id);
      const singular = I18N.get() === 'en' && Math.round(vol * 10) / 10 === 1;
      const unit = h.unit === 'custom' ? (h.customUnit || T('unitUnits'))
        : singular ? ({ pages: 'page', times: 'time', minutes: 'minute', hours: 'hour' }[h.unit] || h.unit)
        : T('unit' + h.unit[0].toUpperCase() + h.unit.slice(1));
      const pct = full / n;
      return `
      <div class="hstat">
        <div class="icon-chip sm" style="background:${U.rgba(h.color, 0.14)}">${h.icon}</div>
        <div class="hstat-main">
          <div class="hstat-name">${U.esc(h.name)}</div>
          <div class="hstat-sub">${I18N.num(full)}/${I18N.num(n)} ${T('repDays')} \u00B7 ${I18N.num(U.fmtNum(Math.round(vol * 10) / 10))} ${U.esc(unit)} \u00B7 ${T('repStreak', { c: I18N.num(st.current), b: I18N.num(st.longest) })}</div>
          <div class="hstat-bar"><span style="width:${Math.round(pct * 100)}%;background:${h.color}"></span></div>
        </div>
        <div class="hstat-pct">${I18N.num(Math.round(pct * 100))}%</div>
      </div>`;
    }).join('') || '<p class="hint">' + T('noHabits') + '</p>';
  }

  function init() {
    document.getElementById('reportRange').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-range]');
      if (!b) return;
      range = b.dataset.range;
      render();
    });
  }

  return { render, init };
})();
