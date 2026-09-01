'use strict';

/* 5-axis radar chart (static canvas render, no animation). */
const Radar = (() => {
  const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  function render(canvas, axes) {
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
    const n = axes.length || 5;
    const angle = (i) => -Math.PI / 2 + i * (2 * Math.PI / n);
    const pt = (i, r) => [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r];

    // grid rings + axis lines
    ctx.strokeStyle = '#E4E6EE';
    ctx.lineWidth = 1;
    for (let g = 1; g <= 4; g++) {
      ctx.beginPath();
      for (let i = 0; i < n; i++) { const p = pt(i, (R * g) / 4); if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }
      ctx.closePath();
      ctx.stroke();
    }
    for (let i = 0; i < n; i++) {
      const p = pt(i, R);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p[0], p[1]); ctx.stroke();
    }

    // data polygon — accent2 (blue) from the theme tokens
    const a2 = U.toRgb(U.cssVar('--accent2', '#1CB0F6'));
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const v = U.clamp(axes[i].value, 0, 1);
      const p = pt(i, R * Math.max(v, 0.03));
      if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]);
    }
    ctx.closePath();
    ctx.fillStyle = `rgba(${a2[0]},${a2[1]},${a2[2]},0.16)`;
    ctx.fill();
    ctx.strokeStyle = `rgb(${a2[0]},${a2[1]},${a2[2]})`;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // vertex dots colored by value
    for (let i = 0; i < n; i++) {
      const v = U.clamp(axes[i].value, 0, 1);
      const p = pt(i, R * Math.max(v, 0.03));
      ctx.beginPath(); ctx.arc(p[0], p[1], 3.5, 0, Math.PI * 2);
      ctx.fillStyle = U.progressColor(v);
      ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    }

    // labels + % values
    ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const a = angle(i);
      const lx = cx + Math.cos(a) * (R + 20);
      const ly = cy + Math.sin(a) * (R + 15);
      const c = Math.cos(a);
      ctx.textAlign = Math.abs(c) < 0.35 ? 'center' : (c > 0 ? 'left' : 'right');
      ctx.fillStyle = '#8A8F9D';
      ctx.font = '600 11.5px ' + FONT;
      ctx.fillText(I18N.cat(axes[i].label), lx, ly - 6);
      ctx.fillStyle = '#9AA0B0';
      ctx.font = '10.5px ' + FONT;
      ctx.fillText(I18N.num(Math.round(U.clamp(axes[i].value, 0, 1) * 100)) + '%', lx, ly + 7);
    }
  }

  return { render };
})();
