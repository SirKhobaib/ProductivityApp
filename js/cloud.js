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

  return { init, norm, fetchRow, push };
})();
