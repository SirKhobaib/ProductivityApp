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

  // A distinct buzz pattern: WebApp.HapticFeedback.notificationOccurred
  // ('success' | 'error' | 'warning') — different from impactOccurred.
  function notify(kind) {
    const t = wa();
    if (t && t.HapticFeedback && t.HapticFeedback.notificationOccurred) {
      try { t.HapticFeedback.notificationOccurred(kind || 'success'); } catch (e) { /* ignore */ }
    } else if (navigator.vibrate) {
      try { navigator.vibrate([30, 40, 60]); } catch (e) { /* unsupported */ }
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

  // Telegram's native MainButton for a sheet's primary action. Only one
  // handler at a time: offClick the previous before registering a new one.
  let mainBtnHandler = null;

  function setMainButton(text, onClick) {
    const t = wa();
    if (!t || !t.MainButton) return false;
    try {
      if (mainBtnHandler) t.MainButton.offClick(mainBtnHandler);
      mainBtnHandler = onClick;
      t.MainButton.setText(text);
      t.MainButton.onClick(onClick);
      t.MainButton.show();
      return true;
    } catch (e) { return false; }
  }

  function hideMainButton() {
    const t = wa();
    if (!t || !t.MainButton) return;
    try {
      if (mainBtnHandler) { t.MainButton.offClick(mainBtnHandler); mainBtnHandler = null; }
      t.MainButton.hide();
    } catch (e) { /* ignore */ }
  }

  // Native confirm dialog (WebApp.showConfirm). Returns false — and does
  // nothing — outside Telegram, so callers fall back to their in-page pattern.
  function confirm(message, onOk) {
    const t = wa();
    if (!t || !t.showConfirm) return false;
    try {
      t.showConfirm(message, (ok) => { if (ok) onOk(); });
      return true;
    } catch (e) { return false; }
  }

  return { init, userName, haptic, notify, setMainButton, hideMainButton, confirm, backButton, onBackClick, colorScheme };
})();
