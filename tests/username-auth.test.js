import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUsername, usernameToEmail, loginToEmail, displayLogin } from '../js/loginIdentity.js';

test('username login preserves existing email accounts and has a separate namespace', () => {
  assert.equal(normalizeUsername(' Hoa.NTB6 '), 'hoa.ntb6');
  assert.equal(usernameToEmail('Hoa.NTB6'), 'hoa.ntb6@username.ibb5.invalid');
  assert.equal(loginToEmail('hoa.ntb6'), usernameToEmail('Hoa.NTB6'));
  assert.equal(loginToEmail(' manager@example.com '), 'manager@example.com');
  assert.equal(displayLogin(usernameToEmail('hoa.ntb6')), 'hoa.ntb6');
  assert.equal(displayLogin('manager@example.com'), 'manager@example.com');
  for (const invalid of ['', 'ab', '.hoa', 'hòa', 'hoa name', 'hoa@example.com', 'a'.repeat(33)]) {
    assert.throws(() => normalizeUsername(invalid));
  }
});

test('account API enforces manager authorization and validates username before creating users', async () => {
  const originalFetch = globalThis.fetch;
  const oldUrl = process.env.SUPABASE_URL;
  const oldKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = 'https://supabase.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-key';
  const created = [];
  let role = 'manager';
  let duplicate = false;
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(input instanceof Request ? input.url : input);
    const method = init.method || 'GET';
    const json = (body, status = 200) => new Response(JSON.stringify(body), {
      status, headers: { 'Content-Type': 'application/json', 'X-Supabase-Api-Version': '2024-01-01' },
    });
    if (url.pathname === '/auth/v1/user') return json({ id: 'manager-id' });
    if (url.pathname === '/rest/v1/profiles' && method === 'GET') return json({ id: 'manager-id', role });
    if (url.pathname === '/auth/v1/admin/users' && method === 'POST') {
      if (duplicate) return json({ code: 'email_exists', msg: 'Already registered' }, 422);
      const body = JSON.parse(init.body);
      created.push(body);
      return json({ id: 'new-id', email: body.email });
    }
    if (url.pathname === '/rest/v1/profiles' && method === 'POST') {
      assert.equal(JSON.parse(init.body).email, created.at(-1).email);
      return new Response(null, { status: 201 });
    }
    throw new Error('Unexpected request: ' + method + ' ' + url.pathname);
  };
  try {
    const { default: handler } = await import('../api/admin-users.js');
    const invoke = async (body, token = 'test-token') => {
      const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
      await handler({ method: 'POST', headers: token ? { authorization: 'Bearer ' + token } : {}, body }, res);
      return res;
    };
    const body = { username: ' Hoa.NTB6 ', password: 'test-password', full_name: 'Test User', role: 'staff', acc: 'test-acc' };
    assert.equal((await invoke(body, '')).code, 401);
    role = 'staff';
    assert.equal((await invoke(body)).code, 403);
    role = 'manager';
    assert.equal((await invoke({ ...body, username: 'bad name' })).code, 400);
    assert.equal(created.length, 0);
    assert.equal((await invoke(body)).code, 200);
    assert.equal(created[0].email, usernameToEmail('hoa.ntb6'));
    assert.equal(created[0].email_confirm, true);
    duplicate = true;
    const conflict = await invoke(body);
    assert.equal(conflict.code, 400);
    assert.match(conflict.body.error, /Tên đăng nhập đã được sử dụng/);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = oldKey;
  }
});
