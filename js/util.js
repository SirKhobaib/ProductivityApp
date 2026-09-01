'use strict';

/* Shared utilities: dates, ids, colors, formatting, toast. */
const U = (() => {
  const ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pad = (n) => String(n).padStart(2, '0');

  const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const keyToDate = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const todayKey = () => dateKey(new Date());
  const addDaysKey = (k, n) => { const d = keyToDate(k); d.setDate(d.getDate() + n); return dateKey(d); };

  const isFa = () => I18N.get() === 'fa';
  const calKind = () => Store.getSetting('calendar', 'iran');

  const fmtMain = (k) => {
    if (!isFa()) return keyToDate(k).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const d = keyToDate(k);
    const j = Jalali.toJalali(d);
    return `${Jalali.WEEKDAYS[d.getDay()]}، ${I18N.num(j[2])} ${Jalali.monthNames(calKind())[j[1] - 1]} ${I18N.num(j[0])}`;
  };
  const fmtFull = (k) => {
    if (!isFa()) return keyToDate(k).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    return fmtMain(k);
  };
  const fmtMonthYear = (d) => {
    if (!isFa()) return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const j = Jalali.toJalali(d);
    return `${Jalali.monthNames(calKind())[j[1] - 1]} ${I18N.num(j[0])}`;
  };
  const fmtDayShort = (k) => {
    if (!isFa()) return keyToDate(k).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const j = Jalali.toJalali(keyToDate(k));
    return `${I18N.num(j[2])} ${Jalali.monthNames(calKind())[j[1] - 1]}`;
  };

  const monthKey = (k) => k.slice(0, 7);

  const mondayOf = (k) => { const d = keyToDate(k); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); return dateKey(d); };
  const weekLabel = (k) => {
    const m = mondayOf(k);
    const a = fmtDayShort(m);
    const b = fmtDayShort(addDaysKey(m, 6));
    return isFa() ? `${a} تا ${b}` : `${a} - ${b}`;
  };

  // Monday-based ISO week key, e.g. "2026-W35"
  const isoWeekKey = (k) => {
    const d = keyToDate(k);
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day + 3); // Thursday of this ISO week
    const isoYear = d.getFullYear();
    const week1Thu = new Date(isoYear, 0, 4);
    week1Thu.setDate(4 - ((week1Thu.getDay() + 6) % 7) + 3);
    const week = 1 + Math.round((d - week1Thu) / (7 * 86400000));
    return `${isoYear}-W${pad(week)}`;
  };

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const uid = (p) => { let s = ''; for (let i = 0; i < 6; i++) s += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)]; return p + s; };

  const lerp = (a, b, t) => a + (b - a) * t;
  const hexToRgb = (h) => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
  const rgba = (hex, a) => { const c = hexToRgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };

  // Palette-restrained intensity scale: the accent color at varying strength
  // (replaces the old red->amber->green rainbow).
  function cssVar(name, fallback) {
    try {
      const v = getComputedStyle(document.body).getPropertyValue(name).trim();
      return v || fallback;
    } catch (e) { return fallback; }
  }
  function toRgb(color) {
    let h = String(color).trim().toLowerCase();
    if (h.indexOf('rgb') === 0) {
      const m = h.match(/\d+/g);
      return m ? [+m[0], +m[1], +m[2]] : [88, 204, 2];
    }
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0];
  }
  const progressColor = (t) => {
    const x = clamp(t, 0, 1);
    const c = toRgb(cssVar('--accent', '#229ED9'));
    const a = (0.3 + 0.7 * x).toFixed(2);
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  };

  const fmtNum = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  let toastTimer = null;
  const toast = (msg) => {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => { el.hidden = true; }, 220);
    }, 1900);
  };

  return {
    dateKey, keyToDate, todayKey, addDaysKey, fmtMain, fmtFull, fmtMonthYear, fmtDayShort,
    monthKey, mondayOf, weekLabel, isoWeekKey, clamp, uid, lerp, hexToRgb, rgba,
    progressColor, fmtNum, esc, debounce, toast, cssVar, toRgb
  };
})();
