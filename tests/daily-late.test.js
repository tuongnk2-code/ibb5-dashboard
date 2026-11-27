import test from 'node:test';
import assert from 'node:assert/strict';
import { reportState } from '../js/dailyReportModel.js';
import { dailyLateSummary, isLateReportChargeDay } from '../js/dailyLateModel.js';

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
    { user_id: 'staff', report_date: '2026-11-09', status: 'submitted', submitted_at: '2026-11-09T22:00:00+07:00', data: {} },
    { user_id: 'staff', report_date: '2026-11-10', status: 'submitted', submitted_at: '2026-11-10T22:00:01+07:00', revision: 1, data: {} },
    { user_id: 'staff', report_date: '2026-11-10', status: 'submitted', submitted_at: '2026-11-10T22:00:01+07:00', revision: 2, data: {} },
    { user_id: 'staff', report_date: '2026-11-11', status: 'exempt', data: {} },
    { user_id: 'staff', report_date: '2026-11-12', status: 'draft', data: {} },
  ];
  const snapshot = { profiles, reports, trackingStart: '2026-11-09' };
  const options = { start: '2026-11-09', end: '2026-11-13', now: new Date('2026-11-13T22:00:00+07:00') };
  const first = dailyLateSummary(snapshot, options);
  assert.equal(first.rows.length, 1);
  assert.deepEqual(first.total, { late: 1, overdue: 1, count: 2, amount: 40000 });
  const next = dailyLateSummary(snapshot, { ...options, now: new Date('2026-11-13T22:00:01+07:00') });
  assert.deepEqual(next.total, { late: 1, overdue: 2, count: 3, amount: 60000 });
  reports.push({ user_id: 'staff', report_date: '2026-11-13', status: 'submitted', submitted_at: '2026-11-14T08:00:00+07:00', data: {} });
  const submitted = dailyLateSummary(snapshot, { ...options, now: new Date('2026-11-14T08:00:00+07:00') });
  assert.deepEqual(submitted.total, { late: 2, overdue: 1, count: 3, amount: 60000 });
});


test('November 2026 excludes both weekend days; December onward excludes only Sunday, by report date', () => {
  for (const day of ['2026-11-06','2026-11-07','2026-11-08','2026-11-28','2026-11-29','2026-12-06','2027-01-03']) assert.equal(isLateReportChargeDay(day),false,day);
  for (const day of ['2026-11-09','2026-11-30','2026-12-05','2027-01-02','2026-10-31']) assert.equal(isLateReportChargeDay(day),true,day);
  const profiles=[{id:'a',role:'staff'}];
  const snapshot={profiles,trackingStart:'2026-11-06',reports:[{user_id:'a',report_date:'2026-11-07',status:'submitted',submitted_at:'2026-11-09T08:00:00+07:00',data:{}}]};
  const november=dailyLateSummary(snapshot,{start:'2026-11-06',end:'2026-11-09',now:new Date('2026-11-10T08:00:00+07:00')});
  assert.deepEqual(november.total,{late:0,overdue:1,count:1,amount:20000});
  snapshot.trackingStart='2026-12-04';snapshot.reports=[{user_id:'a',report_date:'2026-12-05',status:'submitted',submitted_at:'2026-12-07T08:00:00+07:00',data:{}}];
  const december=dailyLateSummary(snapshot,{start:'2026-12-04',end:'2026-12-07',now:new Date('2026-12-08T08:00:00+07:00')});
  assert.deepEqual(december.total,{late:1,overdue:2,count:3,amount:60000});
});
