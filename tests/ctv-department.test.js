import test from 'node:test';
import assert from 'node:assert/strict';
import { canSeeReport, reportDay } from '../js/dailyReportModel.js';
import { dailyReportRollup } from '../js/dailyReportRollupModel.js';
import { careScope, canManageCare } from '../js/customerCareModel.js';
import { canViewWorker, canManageWorker } from '../js/digitalWorkerModel.js';

const manager = { id: 'manager', role: 'manager' };
const staff = { id: 'staff', role: 'staff', acc: 'DNG.ManLM3' };
const ctv = { id: 'ctv', role: 'ctv', acc: null };

test('CTV has no department report, missing-report obligation, care or worker assignment', () => {
  assert.equal(canSeeReport(manager, ctv), false);
  assert.equal(canSeeReport(manager, staff), true);
  assert.equal(careScope(manager, ctv), false);
  assert.equal(canManageCare(manager, ctv), false);
  assert.equal(canViewWorker(manager, ctv), false);
  assert.equal(canManageWorker(manager, ctv), false);
  const day = reportDay();
  const snapshot = { profiles: [staff, ctv], trackingStart: day, reports: [{ user_id: 'ctv', report_date: day, status: 'submitted', data: { actual: 999, commitment: 999, sources: [{ name: 'Zalo', leads: 999, closed: 999 }], support: 'CTV' } }] };
  const result = dailyReportRollup(snapshot, { start: day, end: day });
  assert.deepEqual(result.rows.map(r => r.profile.id), ['staff']);
  assert.equal(result.total.expected, 1);
  for (const key of ['actual', 'commitment', 'leads', 'closed', 'sent', 'support']) assert.equal(result.total[key], 0);
  assert.deepEqual(result.support, []);
});

test('department daily, weekly/range and market APIs omit CTV profiles and never query their reports', async () => {
  const originalFetch = globalThis.fetch;
  process.env.SUPABASE_URL = 'https://supabase.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';
  const reportQueries = [];
  globalThis.fetch = async input => {
    const url = new URL(input instanceof Request ? input.url : input);
    const json = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
    if (url.pathname === '/auth/v1/user') return json({ id: manager.id });
    if (url.pathname === '/rest/v1/profiles') return json(url.searchParams.has('id') ? manager : [manager, staff, ctv]);
    if (['/rest/v1/daily_reports', '/rest/v1/market_reports'].includes(url.pathname)) {
      reportQueries.push(url.searchParams.get('user_id'));
      return json(url.searchParams.get('user_id')?.startsWith('eq.') ? null : []);
    }
    if (url.pathname === '/rest/v1/dashboard_shared_state') return json(null);
    if (url.pathname === '/rest/v1/contracts') return json([]);
    throw Error('Unexpected query ' + url.pathname);
  };
  const invoke = async (handler, query) => {
    const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await handler({ method: 'GET', headers: { authorization: 'Bearer test' }, query }, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.profiles.some(p => p.role === 'ctv'), false);
    assert.ok(res.body.profiles.some(p => p.id === staff.id));
  };
  try {
    const daily = (await import('../api/daily-reports.js')).default;
    const market = (await import('../api/market-reports.js')).default;
    const date = reportDay();
    await invoke(daily, { date });
    await invoke(daily, { from: date, to: date });
    await invoke(market, { date });
    assert.ok(reportQueries.length > 0);
    assert.ok(reportQueries.every(query => !query?.includes('ctv')));
  } finally { globalThis.fetch = originalFetch; }
});
