import test from 'node:test';
import assert from 'node:assert/strict';
import { periodGrowth } from '../js/periodGrowth.js';
test('period comparison distinguishes zero baseline from missing history', () => {
  assert.equal(periodGrowth(5, 0), 'Mới (+5 HĐ)');
  assert.equal(periodGrowth(0, 0), '0,00%');
  assert.equal(periodGrowth(0, 5), '-100,00%');
  assert.equal(periodGrowth(6, 4), '50,00%');
  assert.equal(periodGrowth(5, null), 'Chưa có dữ liệu T−1');
});
