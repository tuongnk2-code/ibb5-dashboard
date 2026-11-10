import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMarketReport, marketTotals, monthDays } from '../js/marketReportModel.js';
import { reportDay } from '../js/dailyReportModel.js';
const payload = () => ({ sessions: 2, demos: 1, pttb: 0, area: ' Hòa Xuân ', note: '' });
test('market totals use sessions as both denominators, ignore draft/exempt, handle empty month', () => {
  assert.deepEqual(marketTotals([]), { sessions: 0, demos: 0, pttb: 0, demoRate: null, pttbRate: null });
  const rows = [{ status: 'submitted', data: payload() }, { status: 'submitted', data: { sessions: 1, demos: 2, pttb: 1 } }, { status: 'draft', data: { sessions: 99, demos: 99, pttb: 99 } }, { status: 'exempt', data: {} }];
  assert.deepEqual(marketTotals(rows), { sessions: 3, demos: 3, pttb: 1, demoRate: 1, pttbRate: 1 / 3 });
  assert.equal(validateMarketReport(payload()).area, 'Hòa Xuân');
  for (const invalid of [-1, 1.5, null, '', 10001]) assert.throws(() => validateMarketReport({ ...payload(), sessions: invalid }));
  assert.equal(monthDays('2028-02').length, 29); assert.throws(() => monthDays('2026-13'));
});
test('market API authenticates and scopes reports, protects revisions and first submission', async () => {
  process.env.SUPABASE_URL = 'https://supabase.test'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';
  const oldFetch = globalThis.fetch, date = reportDay(), records = new Map();
  const people = [{ id: 'a', role: 'staff', acc: 'DNG.ManLM3' }, { id: 'b', role: 'staff', acc: 'DNG.Vypv' }, { id: 'lead', role: 'lead', acc: 'DNG.HoaNTB6' }, { id: 'manager', role: 'manager' }].map(p => ({ ...p, full_name: p.id, created_at: '2020-01-01T00:00:00Z' }));
  let caller = people[0]; const writes = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(input instanceof Request ? input.url : input), method = init.method || 'GET';
    const json = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
    if (url.pathname === '/auth/v1/user') return json({ id: caller.id });
    if (url.pathname === '/rest/v1/profiles') return json(url.searchParams.has('id') ? caller : people);
    if (url.pathname !== '/rest/v1/market_reports') throw Error('Unexpected table: ' + url.pathname);
    const subject = url.searchParams.get('user_id'), reportDate = url.searchParams.get('report_date');
    if (method === 'GET') {
      if (subject?.startsWith('in.')) {
        const ids = subject.slice(4, -1).split(','); return json([...records.values()].filter(r => ids.includes(r.user_id)));
      }
      return json(records.get(subject?.slice(3) + ':' + reportDate?.slice(3)) || null);
    }
    const record = JSON.parse(init.body); writes.push(record);
    const key = record.user_id + ':' + record.report_date, previous = records.get(key);
    if (method === 'PATCH' && String(previous?.revision) !== url.searchParams.get('revision')?.slice(3)) return json(null);
    records.set(key, record); return json(record);
  };
  try {
    const { default: handler } = await import('../api/market-reports.js');
    const invoke = async (method, body = {}, auth = true, query = { date }) => {
      const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
      await handler({ method, headers: auth ? { authorization: 'Bearer test' } : {}, query, body: { date, ...body } }, res); return res;
    };
    assert.equal((await invoke('GET', {}, false)).code, 401);
    assert.deepEqual((await invoke('GET')).body.profiles.map(p => p.id), ['a']);
    assert.equal((await invoke('POST', { action: 'exempt', user_id: 'b', revision: 0, reason: 'Nghỉ' })).code, 403);
    assert.equal((await invoke('POST', { action: 'submit', revision: 0, data: { ...payload(), sessions: -1 } })).code, 400);
    assert.equal((await invoke('POST', { action: 'submit', user_id: 'b', revision: 0, data: payload() })).code, 200);
    assert.equal(writes.at(-1).user_id, 'a'); const first = writes.at(-1).submitted_at;
    assert.equal((await invoke('POST', { action: 'submit', revision: 0, data: payload() })).code, 409);
    assert.equal((await invoke('POST', { action: 'draft', revision: 1, data: payload() })).code, 200);
    assert.equal(writes.at(-1).status, 'submitted'); assert.equal(writes.at(-1).submitted_at, first);
    assert.equal((await invoke('GET', {}, true, { date: '2999-01-01' })).code, 400);
    caller = people[2]; assert.deepEqual((await invoke('GET')).body.profiles.map(p => p.id), ['a', 'lead']);
    assert.equal((await invoke('POST', { action: 'exempt', user_id: 'b', revision: 0, reason: 'Nghỉ' })).code, 403);
    assert.equal((await invoke('POST', { action: 'exempt', user_id: 'a', revision: 2, reason: 'Nghỉ' })).code, 409);
    caller = people[3]; assert.deepEqual((await invoke('GET')).body.profiles.map(p => p.id), ['a', 'b', 'lead']);
    assert.equal((await invoke('POST', { action: 'submit', revision: 0, data: payload() })).code, 403);
    assert.equal((await invoke('POST', { action: 'exempt', user_id: 'b', revision: 0, reason: '' })).code, 400);
    assert.equal((await invoke('POST', { action: 'exempt', user_id: 'b', revision: 0, reason: 'Nghỉ phép' })).code, 200);
    assert.equal((await invoke('POST', { action: 'unexempt', user_id: 'b', revision: 1 })).body.report.status, 'draft');
    const dat={id:'dat',role:'staff',acc:'DNG.DatHX4',full_name:'Dat',created_at:'2020-01-01T00:00:00Z'};people.push(dat);caller=dat;
    assert.deepEqual((await invoke('GET')).body.profiles.map(p=>p.id),['a','b','lead','dat']);
    assert.equal((await invoke('POST',{action:'exempt',user_id:'b',revision:2,reason:'Nghỉ'})).code,403);
    assert.equal((await invoke('POST',{action:'submit',user_id:'a',revision:0,data:payload()})).code,200);assert.equal(writes.at(-1).user_id,'dat');
    caller={...dat,role:'lead'};assert.equal((await invoke('GET')).body.profiles.length,4);
    assert.equal((await invoke('POST',{action:'exempt',user_id:'a',revision:2,reason:'Nghỉ'})).code,403);
    caller=people[0];assert.deepEqual((await invoke('GET')).body.profiles.map(p=>p.id),['a']);
    assert.equal((await invoke('DELETE')).code, 405);
  } finally { globalThis.fetch = oldFetch; delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY; }
});
