'use strict';

/* Map: gamified world — inline-SVG islands unlocked at streak milestones. */
const WorldMap = (() => {
  function svgWrap(inner) {
    return '<svg viewBox="0 0 320 190" role="img" aria-hidden="true">' + inner + '</svg>';
  }

  const SCENES = {
    meadow: svgWrap(
      '<ellipse cx="160" cy="168" rx="150" ry="16" fill="#DCEBFF"/>' +
      '<ellipse cx="160" cy="140" rx="132" ry="40" fill="#46A302"/>' +
      '<ellipse cx="160" cy="132" rx="132" ry="40" fill="#58CC02"/>' +
      '<circle cx="258" cy="38" r="27" fill="#E9E4D0" opacity="0.35"/>' +
      '<circle cx="258" cy="38" r="19" fill="#E9E4D0"/>' +
      '<rect x="150" y="86" width="10" height="28" rx="4" fill="#A05A2C"/>' +
      '<circle cx="155" cy="78" r="17" fill="#3E9A01"/>' +
      '<circle cx="143" cy="88" r="11" fill="#58CC02"/>' +
      '<circle cx="167" cy="88" r="11" fill="#58CC02"/>' +
      '<g fill="#FFFFFF"><circle cx="90" cy="126" r="5"/><circle cx="104" cy="134" r="4"/><circle cx="224" cy="128" r="5"/></g>' +
      '<g fill="#58CC02"><circle cx="90" cy="126" r="1.8"/><circle cx="104" cy="134" r="1.5"/><circle cx="224" cy="128" r="1.8"/></g>' +
      '<g fill="#fff" opacity="0.9"><ellipse cx="70" cy="40" rx="18" ry="8"/><ellipse cx="86" cy="36" rx="14" ry="7"/><ellipse cx="230" cy="72" rx="14" ry="6"/></g>'
    ),
    beach: svgWrap(
      '<ellipse cx="160" cy="168" rx="150" ry="16" fill="#BFEBFF"/>' +
      '<ellipse cx="160" cy="140" rx="132" ry="40" fill="#FFD66B"/>' +
      '<ellipse cx="160" cy="134" rx="132" ry="40" fill="#FFE9A8"/>' +
      '<path d="M96 148c14-34 10-58-4-74" stroke="#A05A2C" stroke-width="9" fill="none" stroke-linecap="round"/>' +
      '<g fill="#3E9A01">' +
      '<ellipse cx="86" cy="70" rx="26" ry="9" transform="rotate(-24 86 70)"/>' +
      '<ellipse cx="106" cy="66" rx="26" ry="9" transform="rotate(16 106 66)"/>' +
      '<ellipse cx="96" cy="60" rx="24" ry="8" transform="rotate(-58 96 60)"/>' +
      '<ellipse cx="100" cy="74" rx="22" ry="8" transform="rotate(48 100 74)"/>' +
      '</g>' +
      '<line x1="226" y1="94" x2="226" y2="132" stroke="#1CB0F6" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M200 96a26 26 0 0 1 52 0z" fill="#1CB0F6"/>' +
      '<path d="M213 96a13 13 0 0 1 26 0z" fill="#fff" opacity="0.35"/>' +
      '<g fill="#8A8F9D"><circle cx="70" cy="150" r="4"/><circle cx="250" cy="146" r="4"/><circle cx="176" cy="152" r="3"/></g>' +
      '<path d="M40 130q10-8 20 0t20 0" stroke="#7FD4FF" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<path d="M262 120q10-8 20 0" stroke="#7FD4FF" stroke-width="4" fill="none" stroke-linecap="round"/>'
    ),
    forest: svgWrap(
      '<ellipse cx="160" cy="168" rx="150" ry="16" fill="#DCEBFF"/>' +
      '<ellipse cx="160" cy="140" rx="132" ry="40" fill="#2E7D0F"/>' +
      '<ellipse cx="160" cy="132" rx="132" ry="40" fill="#46A302"/>' +
      '<path d="M74 112l14-34 14 34z" fill="#2E7D0F"/>' +
      '<path d="M76 100l12-28 12 28z" fill="#3E9A01"/>' +
      '<rect x="85" y="112" width="6" height="10" fill="#A05A2C"/>' +
      '<path d="M228 116l16-40 16 40z" fill="#2E7D0F"/>' +
      '<path d="M230 102l14-32 14 32z" fill="#3E9A01"/>' +
      '<rect x="241" y="116" width="6" height="12" fill="#A05A2C"/>' +
      '<rect x="140" y="92" width="42" height="30" rx="3" fill="#B9782F"/>' +
      '<path d="M134 94l27-22 27 22z" fill="#8B5E17"/>' +
      '<rect x="155" y="104" width="12" height="18" rx="2" fill="#6E4218"/>' +
      '<rect x="172" y="98" width="8" height="8" fill="#DCEBFF"/>' +
      '<g fill="#2E7D0F"><circle cx="112" cy="128" r="8"/><circle cx="122" cy="132" r="6"/><circle cx="204" cy="130" r="7"/></g>'
    ),
    mountain: svgWrap(
      '<ellipse cx="160" cy="168" rx="150" ry="16" fill="#DCEBFF"/>' +
      '<ellipse cx="160" cy="142" rx="132" ry="38" fill="#7C8B9E"/>' +
      '<ellipse cx="160" cy="134" rx="132" ry="38" fill="#9BA6B5"/>' +
      '<path d="M60 118l52-64 52 64z" fill="#6E7B8C"/>' +
      '<path d="M96 76l16-22 16 22z" fill="#fff"/>' +
      '<path d="M150 118l58-74 58 74z" fill="#8794A6"/>' +
      '<path d="M188 72l20-28 20 28z" fill="#fff"/>' +
      '<rect x="136" y="102" width="30" height="20" rx="2" fill="#E8E2D4"/>' +
      '<path d="M132 104l19-16 19 16z" fill="#C25E3A"/>' +
      '<rect x="147" y="110" width="8" height="12" fill="#6E4218"/>' +
      '<path d="M236 118l10-24 10 24z" fill="#2E7D0F"/>' +
      '<path d="M84 120l9-20 9 20z" fill="#2E7D0F"/>'
    ),
    castle: svgWrap(
      '<ellipse cx="160" cy="164" rx="60" ry="12" fill="#E8E2FF" opacity="0.9"/>' +
      '<g fill="#fff">' +
      '<ellipse cx="100" cy="158" rx="42" ry="16"/>' +
      '<ellipse cx="160" cy="150" rx="52" ry="18"/>' +
      '<ellipse cx="224" cy="158" rx="42" ry="16"/>' +
      '</g>' +
      '<g fill="#E3F1FD">' +
      '<rect x="118" y="86" width="84" height="60" rx="4"/>' +
      '<rect x="98" y="102" width="26" height="44" rx="3"/>' +
      '<rect x="196" y="102" width="26" height="44" rx="3"/>' +
      '<rect x="146" y="62" width="28" height="30" rx="3"/>' +
      '</g>' +
      '<g fill="#1CB0F6">' +
      '<path d="M94 102l17-18 17 18z"/>' +
      '<path d="M192 102l17-18 17 18z"/>' +
      '<path d="M142 62l18-20 18 20z"/>' +
      '<rect x="118" y="86" width="84" height="8"/>' +
      '</g>' +
      '<rect x="150" y="118" width="20" height="28" rx="8" fill="#6E4218"/>' +
      '<g fill="#FFC800">' +
      '<rect x="108" y="112" width="7" height="9" rx="2"/>' +
      '<rect x="205" y="112" width="7" height="9" rx="2"/>' +
      '<rect x="154" y="72" width="7" height="9" rx="2"/>' +
      '</g>' +
      '<line x1="160" y1="42" x2="160" y2="30" stroke="#8B5E17" stroke-width="3"/>' +
      '<path d="M160 30l14 5-14 5z" fill="#1CB0F6"/>' +
      '<g fill="#fff" opacity="0.85"><circle cx="60" cy="50" r="2.5"/><circle cx="270" cy="42" r="2"/><circle cx="246" cy="70" r="2"/><circle cx="76" cy="86" r="2"/></g>' +
      '<circle cx="272" cy="34" r="14" fill="#E9E4D0"/>'
    )
  };
  const ISLANDS = [
    { m: 1, name: 'The First Step', scene: 'meadow', tint: '#58CC02' },
    { m: 7, name: 'Beach Cove', scene: 'beach', tint: '#1CB0F6' },
    { m: 30, name: 'Forest Village', scene: 'forest', tint: '#58CC02' },
    { m: 100, name: 'Mountain Town', scene: 'mountain', tint: '#1CB0F6' },
    { m: 365, name: 'Sky Castle', scene: 'castle', tint: '#1CB0F6' }
  ];

  function render() {
    const info = Store.streakInfo();
    const ms = Store.milestones();
    const firstDay = Store.firstLoggedDay();
    const nextIsl = ISLANDS.find((x) => x.m > info.current) || null;

    let html = '';
    ISLANDS.forEach((isl) => {
      const unlocked = isl.m === 1 ? !!firstDay : info.current >= isl.m;
      const reached = isl.m === 1 ? firstDay : (ms[isl.m] || null);

      if (nextIsl && nextIsl.m === isl.m) {
        const p = U.clamp(info.current / nextIsl.m, 0, 1);
        html += `
        <div class="next-stop">
          <div class="next-txt">${T('daysTo', { c: I18N.num(info.current), m: I18N.num(nextIsl.m), name: U.esc(nextIsl.name) })}</div>
          <div class="bar"><span style="width:${Math.round(p * 100)}%;background:${U.progressColor(p)}"></span></div>
        </div>`;
      }

      html += `
      <section class="island${unlocked ? '' : ' locked'}" data-m="${isl.m}" data-name="${U.esc(isl.name)}" data-unlocked="${unlocked}">
        <div class="island-art">${SCENES[isl.scene]}</div>
        <div class="island-meta">
          <span class="island-dot" style="background:${isl.tint}"></span>
          <div class="island-txt">
            <div class="island-name">${unlocked ? U.esc(isl.name) : '???'}</div>
            <div class="island-sub">${unlocked
              ? (isl.m === 1
                ? T('journeyStarted') + (reached ? ' \u00B7 ' + U.fmtMain(reached) : '')
                : (reached ? T('reached', { d: U.fmtMain(reached) }) : T('unlockedLbl')))
              : T('unlocksAt', { n: I18N.num(isl.m) })}</div>
          </div>
          ${unlocked ? '' : '<span class="lock-chip">\u{1F512}</span>'}
        </div>
      </section>
      <div class="trail"></div>`;
    });
    html = html.replace(/<div class="trail"><\/div>\s*$/, '');
    document.getElementById('worldPath').innerHTML = html;
  }

  function init() {
    document.getElementById('worldPath').addEventListener('click', (e) => {
      const isl = e.target.closest('.island');
      if (!isl) return;
      const m = Number(isl.dataset.m);
      const name = isl.dataset.name;
      if (isl.dataset.unlocked !== 'true') {
        U.toast(T('mapLocked', { n: I18N.num(m), name: name }));
        return;
      }
      const info = Store.streakInfo();
      const ms = Store.milestones();
      const firstDay = Store.firstLoggedDay();
      const reached = m === 1 ? firstDay : (ms[m] || null);
      Sheets.open((el) => {
        el.innerHTML = `
          <h3 class="sheet-title">${U.esc(name)}
            <span class="sheet-sub">${reached ? T('reached', { d: U.fmtFull(reached) }) : T('unlockedLbl')}</span>
          </h3>
          <div class="island-art in-sheet">${SCENES[ISLANDS.find((x) => x.m === m).scene]}</div>
          <p class="sheet-note">${T('islandMilestone', { m: I18N.num(m), c: I18N.num(info.current), l: I18N.num(info.longest), p: I18N.num(info.goalPct) })}</p>
          <div class="sheet-actions">
            <button type="button" class="btn primary" id="islandOk">${T('done')}</button>
          </div>`;
        el.querySelector('#islandOk').addEventListener('click', Sheets.close);
      });
    });
  }

  return { render, init, ISLANDS, SCENES };
})();
