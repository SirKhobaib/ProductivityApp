'use strict';

/* Static canvas charts shared by Reports & Streak (no animation). */
const Charts = (() => {
  const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  function setup(canvas, cssH) {
    const parent = canvas.parentElement;
    const cssW = Math.max(240, Math.min((parent.clientWidth || 320) - 28, 460));
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    return { ctx, cssW, cssH };
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, Math.max(0, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

    function bars(canvas, values) {
    const cssH = 170;
    const res = setup(canvas, cssH);
    const ctx = res.ctx, cssW = res.cssW;
    const padL = 6, padR = 6, padB = 22, padT = 10;
    const plotW = cssW - padL - padR;
    const plotH = cssH - padT - padB;
    const n = values.length || 1;
    const gap = n > 16 ? 2 : 5;
    const bw = Math.max(3, plotW / n - gap);

    ctx.strokeStyle = '#E4E6EE';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, cssH - padB + 0.5);
    ctx.lineTo(cssW - padR, cssH - padB + 0.5);
    ctx.stroke();

    values.forEach((v, i) => {
      const x = padL + i * (plotW / n) + gap / 2;
      const h = Math.max(3, plotH * U.clamp(v.value, 0, 1));
      ctx.fillStyle = U.progressColor(v.value);
      roundRect(ctx, x, cssH - padB - h, bw, h, Math.min(4, bw / 2));
      ctx.fill();
      if (v.highlight) {
        ctx.fillStyle = '#22242E';
        ctx.beginPath();
        ctx.arc(x + bw / 2, cssH - padB - h - 6, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    const every = Math.ceil(n / 8);
    ctx.fillStyle = '#9AA0B0';
    ctx.font = '10px ' + FONT;
    ctx.textAlign = 'center';
    values.forEach((v, i) => {
      if (i % every !== 0 && i !== n - 1) return;
      const x = padL + i * (plotW / n) + gap / 2 + bw / 2;
      ctx.fillText(v.label, x, cssH - 7);
    });
  }

  // days: [{ key, col, row, value (0..1 or null) }] — columns are weeks (Mon top).
  function heatmap(canvas, days, weeks) {
    const cssH = 192;
    const res = setup(canvas, cssH);
    const ctx = res.ctx, cssW = res.cssW;
    const gap = 3;
    let cell = Math.floor((cssW - 30) / weeks) - gap;
    cell = Math.max(10, Math.min(cell, 20));
    const padL = Math.max(26, Math.round((cssW - weeks * (cell + gap)) / 2));
    const padT = 22;

    ctx.font = '9.5px ' + FONT;
    ctx.fillStyle = '#9AA0B0';
    ctx.textAlign = 'left';
    const rtl = I18N.isRTL();
    const dowLabels = rtl ? [Jalali.DOW_MIN[0], Jalali.DOW_MIN[2], Jalali.DOW_MIN[4]] : ['Mon', 'Wed', 'Fri'];
    dowLabels.forEach((d, i) => {
      ctx.fillText(d, 2, padT + i * 2 * (cell + gap) + cell - 1);
    });

    let lastMonth = -1;
    days.forEach((d) => {
      const col = rtl ? (weeks - 1 - d.col) : d.col;
      const x = padL + col * (cell + gap);
      const y = padT + d.row * (cell + gap);
      roundRect(ctx, x, y, cell, cell, 3);
      ctx.fillStyle = d.value == null ? '#EEF0F4' : U.progressColor(d.value);
      ctx.fill();
      const dt = U.keyToDate(d.key);
      if (d.row === 0 && dt.getMonth() !== lastMonth && (lastMonth !== -1 || d.col > 0)) {
        ctx.fillStyle = '#5B5F6E';
        ctx.fillText(dt.toLocaleDateString('en-US', { month: 'short' }), x, 11);
        lastMonth = dt.getMonth();
      }
    });
  }

  return { bars, heatmap };
})();
