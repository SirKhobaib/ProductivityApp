'use strict';

/* Onboarding: a friendly first-run Q&A that plants motivation before the app
   starts — name, daily quests (creates real habits), honest time commitment,
   and your "why". Encouraging copy, skippable, EN/FA. */
const Onboard = (() => {
  const L = (en, fa) => (I18N.get() === 'fa' ? fa : en);

  const TEMPLATES = [
    { icon: '\u{1F4A7}', en: 'Drink water', fa: '\u0622\u0628 \u062E\u0648\u0631\u062F\u0646', cat: 'Body', unit: 'custom', cu: { en: 'glasses', fa: '\u0644\u06CC\u0648\u0627\u0646' }, target: 8 },
    { icon: '\u{1F4D6}', en: 'Read pages', fa: '\u0645\u0637\u0627\u0644\u0639\u0647 \u06A9\u062A\u0627\u0628', cat: 'Mind', unit: 'pages', target: 20 },
    { icon: '\u{1F4AA}', en: 'Workout', fa: '\u0648\u0631\u0632\u0634', cat: 'Body', unit: 'minutes', target: 30 },
    { icon: '\u{1F9D8}', en: 'Meditate', fa: '\u0645\u062F\u06CC\u062A\u06CC\u0634\u0646', cat: 'Spiritual', unit: 'minutes', target: 10 },
    { icon: '\u{1F4BB}', en: 'Deep work', fa: '\u06A9\u0627\u0631 \u0639\u0645\u06CC\u0642', cat: 'Work', unit: 'hours', target: 2 },
    { icon: '\u270D\uFE0F', en: 'Journal', fa: '\u0646\u0648\u0634\u062A\u0646 \u062E\u0627\u0637\u0631\u0647', cat: 'Discipline', unit: 'times', target: 1 },
    { icon: '\u{1F932}', en: 'Prayer', fa: '\u0646\u0645\u0627\u0632 \u0648 \u062F\u0639\u0627', cat: 'Spiritual', unit: 'times', target: 1 },
    { icon: '\u{1F6B6}', en: 'Walk', fa: '\u067E\u06CC\u0627\u062F\u0647\u200C\u0631\u0648\u06CC', cat: 'Body', unit: 'custom', cu: { en: 'k steps', fa: '\u0647\u0632\u0627\u0631 \u0642\u062F\u0645' }, target: 8 },
    { icon: '\u{1F4DA}', en: 'Study', fa: '\u062F\u0631\u0633 \u062E\u0648\u0627\u0646\u062F\u0646', cat: 'Mind', unit: 'minutes', target: 45 },
    { icon: '\u{1F319}', en: 'Early to bed', fa: '\u062E\u0648\u0627\u0628 \u0628\u0647\u200C\u0645\u0648\u0642\u0639', cat: 'Discipline', unit: 'times', target: 1 },
    { icon: '\u{1F957}', en: 'Eat clean', fa: '\u063A\u0630\u0627\u06CC \u0633\u0627\u0644\u0645', cat: 'Body', unit: 'times', target: 1 },
    { icon: '\u{1F3AF}', en: 'Plan tomorrow', fa: '\u0628\u0631\u0646\u0627\u0645\u0647\u200C\u06CC \u0641\u0631\u062F\u0627', cat: 'Work', unit: 'times', target: 1 }
  ];
  const COLORS = ['#58CC02', '#1CB0F6', '#5B5F6E'];
  const LEVELS = [
    { id: 'easy', mult: 0.5 },
    { id: 'solid', mult: 1 },
    { id: 'beast', mult: 1.5 }
  ];

  let step = 0;
  let picks = new Set();
  let level = 1; // index into LEVELS
  const data = { name: '', why: '' };

  function el(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    return d.firstElementChild;
  }

  function dots() {
    return `<div class="ob-dots">${[0, 1, 2, 3].map((i) =>
      `<span class="ob-dot${i === step ? ' on' : ''}"></span>`).join('')}</div>`;
  }

  function navHTML(nextLabel, nextId, showBack) {
    return `
      <div class="ob-nav">
        ${showBack ? '<button type="button" class="btn ghost" id="obBack">' + T('obBack') + '</button>' : '<span></span>'}
        <button type="button" class="btn primary" id="${nextId}">${nextLabel}</button>
      </div>`;
  }

  function stepName() {
    return `
      <div class="ob-emoji">\u{1F44B}</div>
      <h1 class="ob-title">${T('obHiTitle')}</h1>
      <p class="ob-sub">${T('obNameQ')}</p>
      <div class="field ob-field">
        <input id="obName" type="text" maxlength="40" placeholder="${T('obNamePh')}" value="${U.esc(data.name)}" />
      </div>
      <p class="ob-hint">${T('obNameHint')}</p>
      ${dots()}
      ${navHTML(T('tourNext'), 'obNext', false)}`;
  }

  function stepPick() {
    const cards = TEMPLATES.map((t, i) => `
      <button type="button" class="ob-quest${picks.has(i) ? ' sel' : ''}" data-q="${i}">
        <span class="ob-quest-icon">${t.icon}</span>
        <span class="ob-quest-name">${U.esc(L(t.en, t.fa))}</span>
      </button>`).join('');
    return `
      <h1 class="ob-title">${T('obPickTitle')}</h1>
      <p class="ob-sub">${T('obPickSub')}</p>
      <div class="ob-quests">${cards}</div>
      ${dots()}
      ${navHTML(T('tourNext'), 'obNext', true)}`;
  }

  function stepTime() {
    const cards = LEVELS.map((lv, i) => `
      <button type="button" class="ob-level${i === level ? ' sel' : ''}" data-lv="${i}">
        <span class="ob-level-name">${T('obTime' + (i === 0 ? 'Easy' : i === 1 ? 'Solid' : 'Beast'))}</span>
        <span class="ob-level-sub">${T('obTime' + (i === 0 ? 'EasySub' : i === 1 ? 'SolidSub' : 'BeastSub'))}</span>
      </button>`).join('');
    return `
      <div class="ob-emoji">\u23F3</div>
      <h1 class="ob-title">${T('obTimeTitle')}</h1>
      <p class="ob-sub">${T('obTimeSub')}</p>
      <div class="ob-levels">${cards}</div>
      ${dots()}
      ${navHTML(T('tourNext'), 'obNext', true)}`;
  }

  function stepWhy() {
    return `
      <div class="ob-emoji">\u{1F525}</div>
      <h1 class="ob-title">${T('obWhyTitle')}</h1>
      <p class="ob-sub">${T('obWhySub')}</p>
      <div class="field ob-field">
        <textarea id="obWhy" rows="3" maxlength="200" placeholder="${T('obWhyPh')}">${U.esc(data.why)}</textarea>
      </div>
      ${dots()}
      ${navHTML(T('obFinish'), 'obFinishBtn', true)}`;
  }

  function bind(root, body) {
    body.querySelectorAll('.ob-quest').forEach((b) => {
      b.addEventListener('click', () => {
        const i = Number(b.dataset.q);
        if (picks.has(i)) picks.delete(i); else picks.add(i);
        b.classList.toggle('sel', picks.has(i));
      });
    });
    body.querySelectorAll('.ob-level').forEach((b) => {
      b.addEventListener('click', () => {
        level = Number(b.dataset.lv);
        body.querySelectorAll('.ob-level').forEach((x) => x.classList.toggle('sel', x === b));
      });
    });
    const back = body.querySelector('#obBack');
    if (back) back.addEventListener('click', () => { step--; render(root); });
    const next = body.querySelector('#obNext');
    if (next) next.addEventListener('click', () => {
      if (step === 0) {
        data.name = body.querySelector('#obName').value.trim();
        if (data.name) Store.setProfile({ name: data.name });
      }
      if (step === 1 && !picks.size) { U.toast(T('obPickMin')); return; }
      step++;
      render(root);
    });
    const fin = body.querySelector('#obFinishBtn');
    if (fin) fin.addEventListener('click', () => {
      data.why = body.querySelector('#obWhy').value.trim();
      finish(root);
    });
    const f = body.querySelector('input, textarea');
    if (f && step === 0) setTimeout(() => f.focus(), 250);
  }

  function render(root) {
    const body = root.querySelector('.ob-body');
    body.innerHTML = step === 0 ? stepName() : step === 1 ? stepPick()
      : step === 2 ? stepTime() : stepWhy();
    bind(root, body);
    body.scrollTop = 0;
  }

  function scaledTarget(t) {
    const mult = LEVELS[level].mult;
    if (t.unit === 'minutes') return Math.max(5, Math.round((t.target * mult) / 5) * 5);
    if (t.unit === 'pages') return Math.max(5, Math.round(t.target * mult / 5) * 5);
    if (t.unit === 'hours') return Math.max(1, Math.round(t.target * mult * 2) / 2);
    return t.target;
  }

  function finish(root) {
    picks.forEach((t, n) => {
      const tpl = TEMPLATES[t];
      Store.addHabit({
        name: L(tpl.en, tpl.fa),
        unit: tpl.unit,
        customUnit: tpl.unit === 'custom' ? L(tpl.cu.en, tpl.cu.fa) : '',
        target: scaledTarget(tpl),
        icon: tpl.icon,
        color: COLORS[n % COLORS.length],
        category: tpl.cat
      });
    });
    if (data.why) Store.setProfile({ bio: data.why });
    Store.markOnboarded();
    root.hidden = true;
    App.refresh();
    Tour.start();
  }

  function start() {
    step = 0;
    picks = new Set();
    level = 1;
    let root = document.getElementById('onboardRoot');
    if (!root) {
      root = el('<div class="ob-root" id="onboardRoot" hidden><div class="ob-skip"><button type="button" class="btn ghost sm" id="obSkip"></button></div><div class="ob-body"></div></div>');
      document.body.appendChild(root);
      root.querySelector('#obSkip').addEventListener('click', () => {
        Store.markOnboarded();
        root.hidden = true;
        Tour.start();
      });
    }
    root.querySelector('#obSkip').textContent = T('tourSkip');
    root.hidden = false;
    render(root);
  }

  return { start };
})();
