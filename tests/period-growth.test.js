import test from 'node:test';
import assert from 'node:assert/strict';
import { periodGrowth } from '../js/periodGrowth.js';
test('period comparison shows signed contract differences, including a zero baseline', () => {
  assert.equal(periodGrowth(5, 0), '+5 HĐ');
  assert.equal(periodGrowth(0, 0), '0 HĐ');
  assert.equal(periodGrowth(0, 5), '-5 HĐ');
  assert.equal(periodGrowth(6, 4), '+2 HĐ');
  assert.equal(periodGrowth(5, null), 'Chưa có dữ liệu T−1');
});
