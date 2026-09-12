'use strict';

/* Cloud sync (Supabase), keyed by the profile's username — not by device.
   localStorage stays the source of truth; the cloud is an additive mirror.
   Only the publishable key lives here — never a secret key.
   Every network path fails silently: offline / unreachable Supabase means the
   app keeps working exactly as before, on localStorage alone. */
const Cloud = (() => {
  const SUPABASE_URL = 'https://sbynnxtyruxctclzumss.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_ZlKIKXjPQ3YKwvhGTYUtfA_4pvogLkZ';
  let client = null;

  function init() {
    if (!window.supabase || !window.supabase.createClient) return; // CDN unavailable
    try { client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY); }
    catch (e) { client = null; }
  }

  // Usernames are identity keys: case-insensitive, trimmed.
  const norm = (u) => String(u || '').trim().toLowerCase();

  async function fetchRow(username) {
    if (!client || !username) return null;
    try {
      const { data, error } = await client.from('profiles')
        .select('data').eq('username', username).maybeSingle();
      if (error) { console.warn('Cloud fetch failed:', error.message); return null; }
      return data || null;
    } catch (e) { console.warn('Cloud fetch failed:', e); return null; }
  }

  async function push(username, payload) {
    if (!client || !username) return;
    try {
      const { error } = await client.from('profiles').upsert({ username: username, data: payload });
      if (error) console.warn('Cloud push failed:', error.message);
    } catch (e) { console.warn('Cloud push failed:', e); }
  }

  // Boot-time last-write-wins, keyed by the saved username:
  //   no cloud row      -> push local state (first time this device is seen)
  //   cloud is newer    -> pull (adopt the cloud state wholesale)
  //   local is newer    -> push (this device has the latest changes)
  // Both sides carry an ISO `updatedAt` stamp, so the comparison is a plain
  // string compare. Called fire-and-forget from app boot; never blocks it.
  async function sync() {
    const username = norm((window.Store && Store.getProfile) ? Store.getProfile().username : '');
    if (!client || !username) return;
    const row = await fetchRow(username);
    const local = Store.data;
    if (!row || !row.data) { push(username, local); return; }
    const cloudTs = String(row.data.updatedAt || '');
    const localTs = String(local.updatedAt || '');
    if (cloudTs > localTs) {
      try {
        Store.importData(JSON.parse(JSON.stringify(row.data)));
        if (window.App && App.refresh) App.refresh();
      } catch (e) { console.warn('Cloud sync pull skipped:', e); }
    } else if (localTs > cloudTs) {
      push(username, local);
    }
  }

  return { init, norm, fetchRow, push, sync };
})();
