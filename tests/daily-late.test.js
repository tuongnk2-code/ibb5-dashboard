import test from 'node:test';
import assert from 'node:assert/strict';
import { reportState } from '../js/dailyReportModel.js';
import { dailyLateSummary } from '../js/dailyLateModel.js';

test('22:00:00 is on time; only later submissions or missing reports after the deadline count', () => {
  const day = '2026-11-10', deadline = new Date(day + 'T22:00:00+07:00');
  for (const timestamp of ['21:59:59', '22:00:00']) assert.equal(reportState({ status: 'submitted', submitted_at: day + 'T' + timestamp + '+07:00' }, day, deadline), 'submitted');
  assert.equal(reportState({ status: 'submitted', submitted_at: day + 'T22:00:00.001+07:00' }, day, deadline), 'late');
  assert.equal(reportState(null, day, deadline), 'missing');
  assert.equal(reportState({ status: 'draft' }, day, deadline), 'draft');
  assert.equal(reportState(null, day, new Date(deadline.getTime() + 1)), 'overdue');
});

test('late and overdue count once per person/day at 20,000; ignores exempt, CTV, managers and duplicate revisions', () => {
  const profiles = [{ id: 'staff', role: 'staff', acc: 'DNG.ManLM3' }, { id: 'ctv', role: 'ctv' }, { id: 'manager', role: 'manager' }];
  const reports = [
    { user_id: 'staff', report_date: '2026-11-01', status: 'submitted', submitted_at: '2026-11-01T22:00:00+07:00', data: {} },
    { user_id: 'staff', report_date: '2026-11-02', status: 'submitted', submitted_at: '2026-11-02T22:00:01+07:00', revision: 1, data: {} },
    { user_id: 'staff', report_date: '2026-11-02', status: 'submitted', submitted_at: '2026-11-02T22:00:01+07:00', revision: 2, data: {} },
    { user_id: 'staff', report_date: '2026-11-03', status: 'exempt', data: {} },
    { user_id: 'staff', report_date: '2026-11-04', status: 'draft', data: {} },
  ];
  const snapshot = { profiles, reports, trackingStart: '2026-11-01' };
  const options = { start: '2026-11-01', end: '2026-11-05', now: new Date('2026-11-05T22:00:00+07:00') };
  const first = dailyLateSummary(snapshot, options);
  assert.equal(first.rows.length, 1);
  assert.deepEqual(first.total, { late: 1, overdue: 1, count: 2, amount: 40000 });
  const next = dailyLateSummary(snapshot, { ...options, now: new Date('2026-11-05T22:00:01+07:00') });
  assert.deepEqual(next.total, { late: 1, overdue: 2, count: 3, amount: 60000 });
  reports.push({ user_id: 'staff', report_date: '2026-11-05', status: 'submitted', submitted_at: '2026-11-06T08:00:00+07:00', data: {} });
  const submitted = dailyLateSummary(snapshot, { ...options, now: new Date('2026-11-06T08:00:00+07:00') });
  assert.deepEqual(submitted.total, { late: 2, overdue: 1, count: 3, amount: 60000 });
});
