import test from 'node:test';
import assert from 'node:assert/strict';
import { clbhMonths, prepaidShare } from '../js/prepaidKpi.js';
import { validateSnapshot } from '../js/dashboardStateModel.js';

test('CLBH policy requires at least three months and ignores price, fees and old prepaid field', () => {
  assert.equal(clbhMonths('Basic Net 1T 120k/1T, 300k PHM'), 1);
  assert.equal(clbhMonths('Trả trước 3T 615k/3T, 300k PHM'), 3);
  assert.equal(clbhMonths('Tra truoc 13T 2388k/13T'), 13);
  assert.equal(clbhMonths('Trả trước 6 tháng'), 6);
  assert.equal(clbhMonths('300k PHM'), null);
  assert.equal(clbhMonths(null), null);
  const rows = [
    { id: 'A', netClbh: 'Basic Net 1T 300k PHM', prepaid: 13 },
    { id: 'B', netClbh: 'Tra truoc 2T', prepaid: 6 },
    { id: 'C', netClbh: 'Tra truoc 3T', prepaid: 0 },
    { id: 'C', netClbh: 'Tra truoc 3T', prepaid: 0 },
    { id: 'D', netClbh: 'Tra truoc 6T' },
    { id: 'E', netClbh: 'Tra truoc 13T' },
    { id: 'F', prepaid: 13 },
  ];
  assert.deepEqual(prepaidShare(rows), { count: 3, total: 6, percent: 50 });
  assert.deepEqual(prepaidShare([]), { count: 0, total: 0, percent: null });
});

test('shared snapshot retains CLBH policy text across devices', () => {
  const result = validateSnapshot({ data: [{ id:'NET1',type:'Internet',netClbh:'Tra truoc 3T 615k/3T',prepaid:0 }] });
  assert.equal(result.data[0].netClbh,'Tra truoc 3T 615k/3T');
  assert.equal(prepaidShare(result.data).count,1);
});
