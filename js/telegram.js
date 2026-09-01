'use strict';

/* Telegram Mini App integration. Everything no-ops in a normal browser:
   window.Telegram is absent there, so the app just runs as a standalone page.
   Exposes: init(), userName(), haptic(kind), backButton(show), onBackClick(fn), colorScheme(). */
const TG = (() => {
  const wa = () => (window.Telegram && window.Telegram.WebApp) || null;
  let scheme = 'light';

  function init() {
    const t = wa();
    if (!t) return;
    try {
      t.ready();
      t.expand();
      scheme = t.colorScheme === 'dark' ? 'dark' : 'light';
      // Match Telegram's own chrome so the app blends into the client.
      if (t.setHeaderColor) t.setHeaderColor(scheme === 'dark' ? 'bg_color' : 'secondary_bg_color');
      if (t.setBackgroundColor) t.setBackgroundColor('bg_color');
      t.onEvent('themeChanged', () => {
        scheme = t.colorScheme === 'dark' ? 'dark' : 'light';
      });
    } catch (e) { /* older Telegram clients: stay functional */ }
  }

  // Telegram profile name, used to prefill the onboarding name field.
  function userName() {
    const t = wa();
    const u = t && t.initDataUnsafe && t.initDataUnsafe.user;
    if (!u) return '';
    return [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  }

  function haptic(kind) {
    const t = wa();
    if (t && t.HapticFeedback) {
      try { t.HapticFeedback.impactOccurred(kind || 'light'); } catch (e) { /* ignore */ }
    } else if (navigator.vibrate) {
      try { navigator.vibrate(8); } catch (e) { /* unsupported */ }
    }
  }

  function backButton(show) {
    const t = wa();
    if (!t || !t.BackButton) return;
    try { if (show) t.BackButton.show(); else t.BackButton.hide(); } catch (e) { /* ignore */ }
  }

  function onBackClick(fn) {
    const t = wa();
    if (t && t.BackButton && t.BackButton.onClick) {
      try { t.BackButton.onClick(fn); } catch (e) { /* ignore */ }
    }
  }

  function colorScheme() { return scheme; }

  return { init, userName, haptic, backButton, onBackClick, colorScheme };
})();
