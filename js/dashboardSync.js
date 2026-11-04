import { getSession } from './auth.js';
import { LEGACY_KEYS, unpackState, monthKey } from './dashboardStateModel.js';

async function request(method, body, query = '') {
  const session = await getSession();
  if (!session?.access_token) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  const res = await fetch('/api/dashboard-sync' + query, { method, cache: 'no-store', headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(result.error || 'Không tải được dữ liệu đồng bộ. Vui lòng thử lại.');
  return result;
}
function legacy() {
  const values = {};
  for (const [name, key] of Object.entries(LEGACY_KEYS)) { try { values[name] = JSON.parse(localStorage.getItem(key) || 'null'); } catch { values[name] = null; } }
  return values;
}
function fingerprint(value) {
  const text = JSON.stringify(value); let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16);
}
export async function bootstrapDashboardSync(profile) {
  let state = await request('GET');
  if (profile.role === 'manager') {
    const old = legacy(), marker = 'ibb5_cloud_migrated:' + profile.id, version = fingerprint(old);
    let migrated; try { migrated = localStorage.getItem(marker); } catch { /* Storage may be disabled. */ }
    if (migrated !== version && (old.snapshot?.data?.length || Object.keys(old.commitments || {}).length || Object.keys(old.notes || {}).length)) {
      await request('POST', { kind: 'migrate', ...old }); state = await request('GET');
      try { localStorage.setItem(marker, version); } catch { /* Migration is idempotent. */ }
    }
  }
  function apply() {
    window.IBB5_SHARED_STATE = state;
    window.IBB5_PENDING_NOTES = state.notes;
    if (state.snapshot) { window.IBB5_IMPORTED_DATA = state.snapshot.data; window.IBB5_IMPORT_META = state.snapshot.meta; }
    else { delete window.IBB5_IMPORTED_DATA; delete window.IBB5_IMPORT_META; }
  }
  function accept(row) {
    const rows = Object.entries(state.revisions).filter(([key]) => key !== row.key).map(([key, revision]) => ({ key, revision, data: key === 'snapshot' ? state.snapshot : key.startsWith('pending:') ? state.notes[key.slice(8)] : state.commitments[key.slice(7, 14)]?.[key.slice(15)] }));
    state = unpackState([...rows, row]); apply(); document.dispatchEvent(new Event('ibb5-shared-updated'));
  }
  apply();
  window.IBB5_SYNC = {
    async pending(id, value) { const result = await request('POST', { kind: 'pending', id, value, revision: state.revisions['pending:' + id] || 0 }); accept(result.row); return result.row.data; },
    async commit(payload) { const key = monthKey(payload.month, payload.room); const result = await request('POST', { kind: 'commit', ...payload, revision: state.revisions[key] || 0 }); accept(result.row); return state.commitments; },
    async snapshot(value, types) { const result = await request('POST', { kind: 'snapshot', snapshot: value, types, revision: state.revisions.snapshot || 0 }); accept(result.row); return result.row.data; },
  };
  return state;
}
export function installSyncControls() {
  const host = document.querySelector('.top-right');
  if (!host || document.getElementById('dashboardSyncBtn')) return;
  const button = document.createElement('button'); button.id = 'dashboardSyncBtn'; button.type = 'button'; button.textContent = '↻ Đồng bộ'; button.title = 'Tải dữ liệu mới nhất từ Supabase';
  button.onclick = () => location.reload(); host.prepend(button);
  const tag = host.querySelector('.tag'); if (tag) { tag.textContent = '● Đã đồng bộ'; tag.title = 'Dữ liệu dùng chung trên Supabase'; }
  const banner = document.createElement('div'); banner.id = 'dashboardSyncNotice'; banner.hidden = true;
  banner.innerHTML = '<span>Có dữ liệu mới từ thiết bị khác.</span><button type="button">Tải lại dữ liệu</button>'; banner.querySelector('button').onclick = () => location.reload();
  document.querySelector('.content').prepend(banner);
  let checking = false;
  async function check() {
    if (checking || document.hidden) return;
    checking = true;
    try { const result = await request('GET', null, '?versions=1'); banner.hidden = result.signature === window.IBB5_SHARED_STATE?.signature; }
    catch { button.textContent = '↻ Thử đồng bộ'; } finally { checking = false; }
  }
  setInterval(check, 60000); document.addEventListener('visibilitychange', check);
}
