import test from 'node:test';
import assert from 'node:assert/strict';
import { reportDay, validDay, reportState, validateReport, canSeeReport, reportText, reportIdentity } from '../js/dailyReportModel.js';

const payload = () => ({ actual: 4, commitment: 1, tomorrowPttb: 1, tomorrowOnline: 1, monthlyTarget: 40, sources: [{ name: 'Zalo', leads: 4, closed: 3 }], difficulty: '', support: 'Hỗ trợ khách', focus: '' });
test('Vietnam deadline includes drafts and submitted-late distinction', () => {
  assert.equal(reportDay(new Date('2026-11-04T18:00:00Z')), '2026-11-05');
  assert.equal(validDay('2026-02-30'), false);
  assert.equal(validDay('2028-02-29'), true);
  const before = new Date('2026-11-04T14:59:59Z'), after = new Date('2026-11-04T15:00:00Z');
  assert.equal(reportState(null, '2026-11-04', before), 'missing');
  assert.equal(reportState({ status: 'draft' }, '2026-11-04', before), 'draft');
  assert.equal(reportState({ status: 'draft' }, '2026-11-04', after), 'overdue');
  assert.equal(reportState({ status: 'exempt' }, '2026-11-04', after), 'exempt');
  assert.equal(reportState({ status: 'submitted', submitted_at: '2026-11-04T15:01:00Z' }, '2026-11-04', after), 'late');
  assert.equal(reportState({ status: 'submitted', submitted_at: '2026-11-04T14:59:00Z' }, '2026-11-04', after), 'submitted');
});
test('report scope is self, own team for leads, all for managers', () => {
  const lead = { id: 'lead', role: 'lead', acc: 'DNG.HoaNTB6' };
  assert.equal(canSeeReport(lead, { id: 'a', role: 'staff', acc: 'DNG.ManLM3' }), true);
  assert.equal(canSeeReport(lead, { id: 'b', role: 'staff', acc: 'DNG.Vypv' }), false);
  assert.equal(canSeeReport({ ...lead, acc: 'unknown' }, { id: 'b', acc: 'unknown' }), false);
  assert.equal(canSeeReport({ id: 'a', role: 'staff' }, { id: 'b', role: 'staff' }), false);
  assert.equal(canSeeReport({ id: 'a', role: 'staff' }, { id: 'a' }), true);
  assert.equal(canSeeReport({ role: 'manager' }, { id: 'a' }), true);
});
test('report validates source arithmetic and text export preserves actual/commitment', () => {
  const valid = validateReport(payload());
  assert.equal(valid.actual, 4); assert.equal(valid.commitment, 1);
  assert.throws(() => validateReport({ ...payload(), actual: -1 }));
  assert.throws(() => validateReport({ ...payload(), sources: [{ name: 'Zalo', leads: 1, closed: 2 }] }));
  assert.throws(() => validateReport({ ...payload(), sources: [{ name: '', leads: 0, closed: 0 }] }));
  assert.match(reportText({ full_name: 'Test' }, '2026-11-04', { ...valid, online: 1, monthlyOnline: 5 }), /PTTB trong ngày: 4\/1/);
  assert.equal(reportIdentity({ full_name: 'Không hiển thị', acc: 'DNG.DatBTH' }), 'DNG.DatBTH');
  assert.match(reportText({ full_name: 'Không hiển thị', acc: 'DNG.DatBTH' }, '2026-11-04', valid), /^DNG.DatBTH báo cáo/);
});

test('report API restricts access, enforces revisions and never trusts client online counts', async () => {
  const oldFetch = globalThis.fetch;
  process.env.SUPABASE_URL = 'https://supabase.test'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';
  const people = [{ id: 'a', role: 'staff', acc: 'DNG.ManLM3', full_name: 'A', created_at: '2020-01-01T00:00:00Z' }, { id: 'b', role: 'staff', acc: 'DNG.Vypv', full_name: 'B', created_at: '2020-01-01T00:00:00Z' }];
  let caller = people[0], record = null, cloudSnapshot = null;
  const date = reportDay();
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(input instanceof Request ? input.url : input), method = init.method || 'GET';
    const json = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
    if (url.pathname === '/auth/v1/user') return json({ id: caller.id });
    if (url.pathname === '/rest/v1/profiles') return json(url.searchParams.has('id') ? caller : people);
    if (url.pathname === '/rest/v1/contracts') return json([{ id: 'NET1', staff: caller.acc, date }]);
    if (url.pathname === '/rest/v1/dashboard_shared_state') return json(cloudSnapshot);
    if (url.pathname === '/rest/v1/daily_reports') {
      if (method === 'GET') {
        if (url.searchParams.get('report_date')?.startsWith('gte.')) {
          assert.equal(url.searchParams.get('user_id'), 'eq.a');
          assert.equal(url.searchParams.get('status'), 'eq.submitted');
          assert.equal(url.searchParams.get('order'), 'report_date.desc');
          return json(record?.status === 'submitted' ? [record] : []);
        }
        if (url.searchParams.get('report_date') !== 'eq.' + date) return json(null);
        if (url.searchParams.has('in') || url.searchParams.get('user_id')?.startsWith('in.')) return json(record ? [record] : []);
        return json(record);
      }
      record = JSON.parse(init.body); return json(record);
    }
    throw new Error(method + ' ' + url.pathname);
  };
  try {
    const { default: handler } = await import('../api/daily-reports.js');
    const invoke = async (method, body, auth = true, query = { date }) => {
      const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } };
      await handler({ method, query, headers: auth ? { authorization: 'Bearer test' } : {}, body: { date, ...body } }, res); return res;
    };
    assert.equal((await invoke('GET', {}, false)).code, 401);
    const list = await invoke('GET', {});
    assert.equal(list.code, 200); assert.deepEqual(list.body.profiles.map(p => p.id), ['a']);
    cloudSnapshot = { data: { data: [{ id: 'SHARED1', type: 'Internet', staff: caller.acc, date }, { id: 'SHARED2', type: 'Internet', staff: caller.acc, date }] } };
    assert.equal((await invoke('GET', {})).body.metrics.a.online, 2);
    cloudSnapshot = null;
    assert.equal((await invoke('POST', { action: 'exempt', user_id: 'b', revision: 0 })).code, 403);
    const saved = await invoke('POST', { action: 'submit', revision: 0, data: { ...payload(), online: 999 } });
    assert.equal(saved.code, 200); assert.equal(record.status, 'submitted'); assert.equal(record.data.online, 1);
    const history = await invoke('GET', {}, true, { history: 'mine', month: date.slice(0, 7), user_id: 'b' });
    assert.equal(history.code, 200); assert.equal(history.body.reports[0].user_id, 'a');
    assert.equal((await invoke('GET', {}, true, { history: 'mine', month: '2026-13' })).code, 400);
    assert.equal((await invoke('POST', { action: 'draft', revision: 0, data: payload() })).code, 409);
    assert.equal((await invoke('POST', { action: 'draft', revision: 1, data: payload() })).code, 200);
    assert.equal(record.status, 'submitted'); assert.equal(record.revision, 2);
    assert.equal((await invoke('POST', { date: '2999-01-01', action: 'submit' })).code, 400);
    caller = { ...people[0], role: 'manager' };
    assert.equal((await invoke('GET', {})).body.profiles.length, 2);
    record = null;
    assert.equal((await invoke('POST', { action: 'exempt', user_id: 'b', revision: 0, reason: '' })).code, 400);
    assert.equal((await invoke('POST', { action: 'exempt', user_id: 'b', revision: 0, reason: 'Nghỉ phép' })).code, 200);
    assert.equal(record.status, 'exempt'); assert.equal(record.updated_by, caller.id);
    assert.equal((await invoke('POST', { action: 'unexempt', user_id: 'b', revision: 1 })).code, 200);
    assert.equal(record.status, 'draft');
  } finally { globalThis.fetch = oldFetch; delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY; }
});
