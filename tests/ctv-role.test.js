import test from 'node:test';
import assert from 'node:assert/strict';
import { canSeeReport } from '../js/dailyReportModel.js';

test('CTV is denied business APIs, allowed only the document route; manager can assign CTV without Acc', async () => {
  process.env.SUPABASE_URL = 'https://supabase.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-key';
  const originalFetch = globalThis.fetch;
  let role = 'ctv';
  const writes = [], reads = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(input instanceof Request ? input.url : input);
    const method = init.method || 'GET';
    const json = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
    if (url.pathname === '/auth/v1/user') return json({ id: 'caller' });
    if (url.pathname === '/rest/v1/profiles' && method === 'GET') return json({ id: 'caller', role });
    if (url.pathname === '/auth/v1/admin/users') return json({ id: 'created', email: 'ctv.test@username.ibb5.invalid' });
    if (url.pathname === '/rest/v1/profiles' && ['POST', 'PATCH'].includes(method)) { writes.push(JSON.parse(init.body)); return new Response(null, { status: 201 }); }
    if (url.pathname === '/rest/v1/dashboard_shared_state') { reads.push(url.searchParams.get('key')); return json({ data: { code: 'QT', originalHtml: '<p>Document</p>' } }); }
    throw Error('Unexpected data request: ' + url.pathname);
  };
  const res = () => ({ setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
  const request = { headers: { authorization: 'Bearer fake-token' }, method: 'GET', query: {} };
  try {
    const { requireProfile } = await import('../api/_supabaseAdmin.js');
    for (const r of ['manager', 'lead', 'staff']) { role = r; assert.equal((await requireProfile(request)).caller.role, r); }
    role = 'ctv';
    assert.equal((await requireProfile(request)).status, 403);
    assert.equal((await requireProfile({ headers: {} })).status, 401);
    const { default: sync } = await import('../api/dashboard-sync.js');
    for (const [method, query] of [['GET', {}], ['GET', { keys: '["snapshot"]' }], ['POST', { document: 'sales-procedure' }]]) {
      const output = res(); await sync({ ...request, method, query }, output); assert.equal(output.code, 403);
    }
    assert.equal(reads.length, 0);
    const output = res(); await sync({ ...request, query: { document: 'sales-procedure', keys: '["snapshot"]' } }, output);
    assert.equal(output.code, 200); assert.deepEqual(reads, ['eq.qms:2-SEL.0.0.1-QT/KD/HDCV/FTEL']);
    const { default: users } = await import('../api/admin-users.js');
    const body = { username: 'ctv.test', password: 'test-password', full_name: 'CTV Test', role: 'ctv', acc: 'DNG.Vypv' };
    const denied = res(); await users({ ...request, method: 'POST', body }, denied); assert.equal(denied.code, 403);
    role = 'manager';
    for (const method of ['POST', 'PATCH']) { const out = res(); await users({ ...request, method, body: { ...body, id: 'existing', ...(method === 'PATCH' ? { password: '' } : {}) } }, out); assert.equal(out.code, 200); assert.equal(writes.at(-1).role, 'ctv'); assert.equal(writes.at(-1).acc, null); }
    assert.equal(canSeeReport({ id: 'self', role: 'ctv' }, { id: 'self', role: 'staff' }), false);
  } finally { globalThis.fetch = originalFetch; }
});
