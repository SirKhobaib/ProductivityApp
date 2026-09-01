'use strict';

/* Haabit landing page — the map itself is the pitch.
   Reuses app assets: WorldMap.ISLANDS / SCENES, Streaks.FLAME_SVG,
   I18N strings + Persian digits, Jalali conversion, U helpers.
   No Store here on purpose: a marketing page must not touch localStorage. */

const Landing = (() => {
  const ISL_KEYS = ['isl1', 'isl2', 'isl3', 'isl4', 'isl5'];
  const AXES = ['Spiritual', 'Mind', 'Body', 'Work', 'Discipline'];
  const START = [40, 60, 30, 70, 50];
  const FOG_RGB = [228, 230, 238];
  const ACCENT_RGB = [34, 158, 217]; // Telegram blue — the pentagon fills toward this
  const FONT = "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif";

  let lang = 'en';
  let flame = 0;
  const values = START.slice();
  const startedAt = Date.now();

  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => window.innerWidth < 768;

  /* ---------- hero: fogged island chain ---------- */
  function buildHero() {
    const world = document.getElementById('heroWorld');
    const isls = WorldMap.ISLANDS;
    let html = '';
    isls.forEach((isl, i) => {
      const locked = i > 0;
      html += `
      <section class="island${locked ? ' locked' : ''}" data-i="${i}" data-revealed="${locked ? 'false' : 'true'}">
        <div class="art-wrap">
          <div class="island-art" aria-hidden="true">${WorldMap.SCENES[isl.scene]}</div>
          ${locked ? '<div class="fog" aria-hidden="true"></div><span class="lock-chip" aria-hidden="true">\u{1F512}</span>' : ''}
        </div>
        <div class="island-meta">
          <span class="island-dot" style="background:${isl.tint}"></span>
          <div class="island-txt">
            <div class="island-name">${locked ? '???' : T(ISL_KEYS[i])}</div>
            <div class="island-sub">${T('unlocksAt', { n: I18N.num(isl.m) })}</div>
          </div>
        </div>
      </section>`;
      if (i < isls.length - 1) html += '<div class="trail" aria-hidden="true"></div>';
    });
    world.innerHTML = html;
  }

  function updateIslandTexts() {
    document.querySelectorAll('#heroWorld .island').forEach((el) => {
      const i = Number(el.dataset.i);
      const isl = WorldMap.ISLANDS[i];
      el.querySelector('.island-name').textContent = el.dataset.revealed === 'true' ? T(ISL_KEYS[i]) : '???';
      el.querySelector('.island-sub').textContent = T('unlocksAt', { n: I18N.num(isl.m) });
    });
  }

  /* Continuous fog scrub (desktop only): p in [0,1]. */
  function setFog(el, p) {
    const fog = el.querySelector('.fog');
    const art = el.querySelector('.island-art');
    if (!fog) return;
    fog.style.opacity = String(1 - p);
    fog.style.transform = 'translateY(' + (-16 * (1 - p)) + 'px)';
    art.style.filter = 'grayscale(' + (0.9 * (1 - p)).toFixed(3) + ') opacity(' + (0.55 + 0.45 * p).toFixed(3) + ')';
  }

  function reveal(el, instant) {
    if (el.dataset.revealed === 'true') return;
    el.dataset.revealed = 'true';
    if (instant) el.classList.add('no-anim');
    // drop inline scrub styles so the class-driven transition finishes cleanly
    const fog = el.querySelector('.fog');
    const art = el.querySelector('.island-art');
    if (fog) { fog.style.opacity = ''; fog.style.transform = ''; }
    if (art) art.style.filter = '';
    el.classList.add('revealed');
    el.querySelector('.island-name').textContent = T(ISL_KEYS[Number(el.dataset.i)]);
    if (instant) requestAnimationFrame(() => el.classList.remove('no-anim'));
  }

  function initFog() {
    const locked = Array.prototype.slice.call(document.querySelectorAll('#heroWorld .island.locked'));
    if (!locked.length) return;
    if (!('IntersectionObserver' in window)) {
      locked.forEach((el) => reveal(el, true));
      return;
    }
    if (reduced() || isMobile()) {
      /* Mobile + reduced motion: threshold-based, one single transition per island —
         no scroll-jacking, no continuous scroll math (transitions are instant
         when the OS asks for reduced motion). */
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) { reveal(en.target, false); io.unobserve(en.target); }
        });
      }, { threshold: 0.45 });
      locked.forEach((el) => io.observe(el));
      return;
    }
    /* Desktop: fog rolls off in sequence, timed to scroll position. */
    let ticking = false;
    const STEP = 210;     // px of scroll between island reveals
    const START_AT = 120; // px of scroll before island 2 starts clearing
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      locked.forEach((el) => {
        if (el.dataset.revealed === 'true') return;
        const i = Number(el.dataset.i) - 1; // 0..3
        const p = U.clamp((y - START_AT - i * STEP) / 240, 0, 1);
        if (p >= 1) reveal(el, false);
        else if (p > 0) setFog(el, p);
      });
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
  }

  /* ---------- radar toy (adapted from js/radar.js geometry) ---------- */
  function drawRadar() {
    const canvas = document.getElementById('radarCanvas');
    if (!canvas) return;
    const parent = canvas.parentElement;
    const cssW = Math.max(250, Math.min((parent.clientWidth || 320) - 28, 440));
    const cssH = 230;
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const cx = cssW / 2;
    const cy = cssH / 2 + 4;
    const R = Math.min(cssW, cssH) / 2 - 36;
    const n = AXES.length;
    const angle = (i) => -Math.PI / 2 + i * (2 * Math.PI / n);
    const pt = (i, r) => [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r];

    // grid rings + axis lines
    ctx.strokeStyle = '#E4E6EE';
    ctx.lineWidth = 1;
    for (let g = 1; g <= 4; g++) {
      ctx.beginPath();
      for (let i = 0; i < n; i++) { const p = pt(i, (R * g) / 4); if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }
      ctx.closePath(); ctx.stroke();
    }
    for (let i = 0; i < n; i++) { const p = pt(i, R); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p[0], p[1]); ctx.stroke(); }

    // fill shifts fog grey -> green as the overall average rises
    const avg = values.reduce((a, b) => a + b, 0) / (n * 100);
    const mix = (k) => Math.round(FOG_RGB[k] + (ACCENT_RGB[k] - FOG_RGB[k]) * avg);
    const col = mix(0) + ',' + mix(1) + ',' + mix(2);

    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const v = U.clamp(values[i] / 100, 0, 1);
      const p = pt(i, R * Math.max(v, 0.03));
      if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(' + col + ',0.30)';
    ctx.fill();
    ctx.strokeStyle = 'rgb(' + col + ')';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // vertex dots colored by value (same ramp as the app)
    for (let i = 0; i < n; i++) {
      const v = U.clamp(values[i] / 100, 0, 1);
      const p = pt(i, R * Math.max(v, 0.03));
      ctx.beginPath(); ctx.arc(p[0], p[1], 4, 0, Math.PI * 2);
      ctx.fillStyle = U.progressColor(v); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    }

    // labels + % values (localized via I18N.cat)
    ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const a = angle(i);
      const lx = cx + Math.cos(a) * (R + 20);
      const ly = cy + Math.sin(a) * (R + 15);
      const c = Math.cos(a);
      ctx.textAlign = Math.abs(c) < 0.35 ? 'center' : (c > 0 ? 'left' : 'right');
      ctx.fillStyle = '#5B5F6E';
      ctx.font = '600 11.5px ' + FONT;
      ctx.fillText(I18N.cat(AXES[i]), lx, ly - 6);
      ctx.font = '10.5px ' + FONT;
      ctx.fillText(I18N.num(Math.round(values[i])) + '%', lx, ly + 8);
    }
  }

  function buildSliders() {
    const wrap = document.getElementById('radarSliders');
    wrap.innerHTML = AXES.map((a, i) => `
      <div class="slider-row">
        <label for="ax${i}">${I18N.cat(a)}</label>
        <input type="range" id="ax${i}" min="0" max="100" step="1" value="${values[i]}" aria-label="${I18N.cat(a)}">
        <output id="axOut${i}">${I18N.num(values[i])}%</output>
      </div>`).join('');
    AXES.forEach((a, i) => {
      document.getElementById('ax' + i).addEventListener('input', (e) => {
        values[i] = Number(e.target.value);
        document.getElementById('axOut' + i).textContent = I18N.num(values[i]) + '%';
        drawRadar();
      });
    });
  }

  /* ---------- flame counter ---------- */
  function updateCaption() {
    const s = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    const t = I18N.num(Math.floor(s / 60)) + ':' + I18N.num(String(s % 60).padStart(2, '0'));
    document.getElementById('flameCap').textContent = T('landingHere', { t: t });
  }

  function buildFlame() {
    document.getElementById('flameIcon').innerHTML = Streaks.FLAME_SVG;
    setInterval(() => {
      if (document.hidden) return;
      flame++;
      document.getElementById('flameNum').textContent = I18N.num(flame);
    }, 1600);
    updateCaption();
    setInterval(updateCaption, 1000);
  }

  /* ---------- language / calendar ---------- */
  function updateDateChip() {
    const el = document.getElementById('dateChip');
    const now = new Date();
    if (lang === 'fa') {
      const j = Jalali.toJalali(now);
      el.textContent = Jalali.WEEKDAYS[now.getDay()] + '\u060C ' + I18N.num(j[2]) + ' ' +
        Jalali.monthNames('iran')[j[1] - 1] + ' ' + I18N.num(j[0]);
    } else {
      el.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  }

  function applyLang(l) {
    lang = l;
    I18N.setLang(l);
    document.documentElement.lang = l;
    document.documentElement.dir = I18N.isRTL() ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = T(el.getAttribute('data-i18n'));
    });
    document.getElementById('langToggle').setAttribute('aria-label', T('landingLang'));
    document.getElementById('flameNum').textContent = I18N.num(flame);
    // Hand the chosen language to the app through the CTA link + localStorage.
    document.getElementById('ctaBtn').href = 'index.html?lang=' + lang;
    updateIslandTexts();
    buildSliders();
    drawRadar();
    updateCaption();
    updateDateChip();
  }

  function toggleLang() {
    const next = lang === 'en' ? 'fa' : 'en';
    if (reduced()) { applyLang(next); return; }
    const targets = document.querySelectorAll('.topbar, .hero, main');
    targets.forEach((el) => el.classList.add('lang-flip'));
    setTimeout(() => {
      applyLang(next);
      requestAnimationFrame(() => targets.forEach((el) => el.classList.remove('lang-flip')));
    }, 230);
  }

  /* ---------- close: next island glowing ---------- */
  function buildCta() {
    const beach = WorldMap.ISLANDS[1];
    document.getElementById('ctaIsland').innerHTML =
      '<div class="island"><div class="island-art" aria-hidden="true">' + WorldMap.SCENES[beach.scene] + '</div></div>';
  }

  /* ---------- init ---------- */
  function init() {
    buildHero();
    buildCta();
    buildSliders();
    drawRadar();
    buildFlame();
    updateDateChip();
    initFog();
    document.getElementById('langToggle').addEventListener('click', toggleLang);
    // Remember the landing language so index.html opens onboarding in it.
    document.getElementById('ctaBtn').addEventListener('click', () => {
      try { localStorage.setItem('habittrack.landingLang', lang); } catch (err) { /* file:// */ }
    });
    window.addEventListener('resize', U.debounce(() => drawRadar(), 150));
    // if the page loads already scrolled (e.g. refresh mid-page), re-run the scrub
    window.addEventListener('load', () => { if (!isMobile()) window.dispatchEvent(new Event('scroll')); });
  }

  return { init };
})();

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', Landing.init);
else Landing.init();
