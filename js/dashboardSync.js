import { getSession } from './auth.js';
import { LEGACY_KEYS, stateRows, mergeStateRows, monthKey } from './dashboardStateModel.js';

async function request(method, body, query = '') {
  const session = await getSession();
  if (!session?.access_token) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch('/api/dashboard-sync' + query, { method, signal: controller.signal, cache: 'no-store', headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.error || 'Không tải được dữ liệu đồng bộ. Vui lòng thử lại.');
    return result;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Kết nối quá lâu. Vui lòng kiểm tra mạng.');
    throw err;
  } finally { clearTimeout(timer); }
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
    if (state.snapshot) { window.IBB5_IMPORTED_DATA = state.snapshot.data; window.IBB5_IMPORT_META = state.snapshot.meta; window.IBB5_CANCELLED_NET = state.snapshot.cancelledNet || []; }
    else { delete window.IBB5_IMPORTED_DATA; delete window.IBB5_IMPORT_META; delete window.IBB5_CANCELLED_NET; }
  }
  function merge(rows, removed = {}) {
    const result = mergeStateRows(state, rows, removed);
    if (!result.changed.length) return false;
    state = result.state; apply();
    const detail = { keys: result.changed };
    if (result.changed.includes('snapshot')) document.dispatchEvent(new CustomEvent('ibb5-snapshot-updated', { detail }));
    document.dispatchEvent(new CustomEvent('ibb5-shared-updated', { detail }));
    return true;
  }
  let refreshing = null;
  async function refresh() {
    if (refreshing) return refreshing;
    refreshing = (async () => {
      const baseline = { ...state.revisions }, versions = await request('GET', null, '?versions=1');
      if (versions.signature === state.signature) return false;
      if (!versions.revisions) { const next = await request('GET'); return merge(stateRows(next)); }
      const keys = Object.keys(versions.revisions).filter(key => versions.revisions[key] > (state.revisions[key] || 0));
      const rows = [];
      for (let i=0; i<keys.length; i+=100) { const result = await request('GET', null, '?keys=' + encodeURIComponent(JSON.stringify(keys.slice(i,i+100)))); rows.push(...result.rows); }
      const removed = Object.fromEntries(Object.entries(baseline).filter(([key]) => !(key in versions.revisions)));
      return merge(rows, removed);
    })();
    try { return await refreshing; } finally { refreshing = null; }
  }
  apply();
  window.IBB5_SYNC = {
    refresh,
    async cancelPending(id, expectedRevision) { const result = await request('POST', { kind: 'cancelPending', id, revision: expectedRevision ?? state.revisions['pending:' + id] ?? 0 }); merge([result.row]); return result.row.data; },
    async pending(id, value, expectedRevision) { const result = await request('POST', { kind: 'pending', id, value, revision: expectedRevision ?? state.revisions['pending:' + id] ?? 0 }); merge([result.row]); return result.row.data; },
    async commit(payload) { const { expectedRevision, ...body } = payload; const key = monthKey(body.month, body.room); const result = await request('POST', { kind: 'commit', ...body, revision: expectedRevision ?? state.revisions[key] ?? 0 }); merge([result.row]); return state.commitments; },
    async snapshot(value, types) { const result = await request('POST', { kind: 'snapshot', snapshot: value, types, revision: state.revisions.snapshot || 0 }); merge([result.row]); return result.row.data; },
  };
  return state;
}
export function installSyncControls() {
  const host = document.querySelector('.top-right');
  if (!host || document.getElementById('dashboardSyncBtn')) return;
  const button = document.createElement('button'); button.id = 'dashboardSyncBtn'; button.type = 'button'; button.textContent = '↻ Đồng bộ'; button.title = 'Tự cập nhật mỗi 5 giây; bấm để lấy ngay dữ liệu mới'; host.prepend(button);
  const tag = host.querySelector('.tag');
  const banner = document.createElement('div'); banner.id = 'dashboardSyncNotice'; banner.hidden = true; banner.setAttribute('role', 'status'); document.querySelector('.content').prepend(banner);
  let checking = false;
  async function check() {
    if (checking || document.hidden) return;
    checking = true;
    try {
      await window.IBB5_SYNC.refresh(); banner.hidden = true;
      if (tag) { tag.textContent = '● Tự đồng bộ'; tag.title = 'Lần kiểm tra gần nhất: ' + new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }); }
      button.textContent = '↻ Đồng bộ';
    } catch (err) {
      if (tag) tag.textContent = '● Chờ kết nối';
      banner.textContent = 'Chưa đồng bộ được: ' + err.message + ' Hệ thống sẽ tự thử lại; nội dung đang nhập được giữ nguyên.'; banner.hidden = false; button.textContent = '↻ Thử đồng bộ';
    } finally { checking = false; }
  }
  button.onclick = check;
  setInterval(check, 5000);
  document.addEventListener('visibilitychange', check); window.addEventListener('focus', check); window.addEventListener('online', check);
  check();
}
