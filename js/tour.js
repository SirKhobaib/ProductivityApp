'use strict';

/* Guided product tour: spotlight + speech bubbles. Funny, skippable, EN/FA. */
const Tour = (() => {
  let idx = 0;
  let els = null;

  function steps() {
    return [
      { sel: '#progressToggle', text: T('tourProgress') },
      { sel: '.datebar', text: T('tourDate') },
      { sel: '#motherTabs', text: T('tourTabs') },
      { sel: '.sub-tabs', text: T('tourScopes'), pre: () => App.setMotherTab('tasks') },
      { sel: '#fab', text: T('tourFab') },
      { sel: '.radar-card', text: T('tourBalance') }
    ];
  }

  function build() {
    const scrim = document.createElement('div');
    scrim.className = 'tour-scrim';
    const hl = document.createElement('div');
    hl.className = 'tour-hl';
    const bubble = document.createElement('div');
    bubble.className = 'tour-bubble';
    bubble.innerHTML = `
      <p class="tour-text"></p>
      <div class="tour-actions">
        <button type="button" class="btn ghost sm" id="tourSkip"></button>
        <button type="button" class="btn ghost sm" id="tourPrev"></button>
        <button type="button" class="btn primary sm" id="tourNext"></button>
      </div>`;
    document.body.append(scrim, hl, bubble);
    els = { scrim, hl, bubble };
    bubble.querySelector('#tourSkip').addEventListener('click', finish);
    bubble.querySelector('#tourNext').addEventListener('click', next);
    bubble.querySelector('#tourPrev').addEventListener('click', prev);
  }

  function show() {
    const list = steps();
    if (idx >= list.length) { finish(); return; }
    const step = list[idx];
    if (step.pre) step.pre();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const target = document.querySelector(step.sel);
      if (!target || !els) { next(); return; }
      target.scrollIntoView({ block: 'center' });
      const r = target.getBoundingClientRect();
      els.hl.style.top = (r.top - 6) + 'px';
      els.hl.style.left = (r.left - 6) + 'px';
      els.hl.style.width = (r.width + 12) + 'px';
      els.hl.style.height = (r.height + 12) + 'px';
      els.bubble.querySelector('.tour-text').textContent = step.text;
      els.bubble.querySelector('#tourNext').textContent = (idx === list.length - 1) ? T('done') : T('tourNext');
      els.bubble.querySelector('#tourSkip').textContent = T('tourSkip');
      const pv = els.bubble.querySelector('#tourPrev');
      pv.textContent = T('tourPrev');
      pv.style.visibility = idx === 0 ? 'hidden' : 'visible';
      els.bubble.style.visibility = 'hidden';
      requestAnimationFrame(() => {
        if (!els) return;
        const bw = els.bubble.offsetWidth;
        const bh = els.bubble.offsetHeight;
        const below = r.bottom + bh + 28 < window.innerHeight;
        let left = Math.min(Math.max(12, r.left + r.width / 2 - bw / 2), window.innerWidth - bw - 12);
        let top = below ? r.bottom + 14 : Math.max(12, r.top - bh - 14);
        els.bubble.style.left = left + 'px';
        els.bubble.style.top = top + 'px';
        els.bubble.style.visibility = 'visible';
      });
    }));
  }

  function next() { idx++; show(); }
  function prev() { if (idx > 0) { idx--; show(); } }

  function finish() {
    Store.markTourDone();
    if (els) { els.scrim.remove(); els.hl.remove(); els.bubble.remove(); els = null; }
  }

  function start(force) {
    if (Store.data.meta.tourDone && !force) return;
    if (!force && new URLSearchParams(location.search).get('tour') === 'skip') { Store.markTourDone(); return; }
    if (els) finish();
    idx = 0;
    build();
    show();
  }

  return { start, replay: () => start(true) };
})();
