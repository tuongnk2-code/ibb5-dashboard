import test from 'node:test';
import assert from 'node:assert/strict';
import { reportDay } from '../js/dailyReportModel.js';

test('all operational roles can view department lateness metadata; ordinary reports retain existing scope and CTV is denied', async () => {
  process.env.SUPABASE_URL = 'https://supabase.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';
  const profiles = [
    { id: 'staff', role: 'staff', acc: 'DNG.ManLM3' },
    { id: 'other', role: 'staff', acc: 'DNG.Vypv' },
    { id: 'lead', role: 'lead', acc: 'DNG.HoaNTB6' },
    { id: 'manager', role: 'manager' },
    { id: 'ctv', role: 'ctv' },
  ];
  let caller = profiles[0];
  const queries = [], originalFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    const url = new URL(input instanceof Request ? input.url : input);
    const json = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
    if (url.pathname === '/rest/v1/dashboard_shared_state') return json([]);
    if (url.pathname === '/auth/v1/user') return json({ id: caller.id });
    if (url.pathname === '/rest/v1/profiles') return json(url.searchParams.has('id') ? caller : profiles);
    if (url.pathname === '/rest/v1/daily_reports') {
      queries.push(url);
      const fields = url.searchParams.get('select');
      if (fields === 'report_date') return json([{ report_date: reportDay() }]);
      return json([{ user_id: caller.id, report_date: reportDay(), status: 'submitted', submitted_at: reportDay() + 'T22:01:00+07:00', revision: 1, ...(fields === '*' ? { data: { difficulty: 'Private report content' } } : {}) }]);
    }
    throw Error('Unexpected query ' + url.pathname);
  };
  try {
    const handler = (await import('../api/daily-reports.js')).default;
    const invoke = async summary => {
      const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
      await handler({ method: 'GET', headers: { authorization: 'Bearer test' }, query: { from: reportDay(), to: reportDay(), ...(summary ? { summary } : {}) } }, res);
      return res;
    };
    for (const profile of profiles.filter(p => p.role !== 'ctv')) {
      caller = profile; queries.length = 0;
      const result = await invoke('late'); assert.equal(result.code, 200);
      assert.deepEqual(result.body.profiles.map(p => p.id), ['staff', 'other', 'lead']);
      assert.ok(queries.some(q => q.searchParams.get('user_id') === 'in.(staff,other,lead)'));
      assert.equal(queries[0].searchParams.get('select'), 'user_id,report_date,status,submitted_at,revision');
      assert.equal(result.body.reports[0].data, undefined);assert.equal(result.body.canConfirmPayment,profile.acc==='DNG.HoaNTB6');
    }
    caller = profiles[0];
    assert.deepEqual((await invoke()).body.profiles.map(p => p.id), ['staff']);
    caller = profiles[2];
    assert.deepEqual((await invoke()).body.profiles.map(p => p.id), ['staff', 'lead']);
    caller = profiles[4]; assert.equal((await invoke('late')).code, 403);
  } finally { globalThis.fetch = originalFetch; }
});
