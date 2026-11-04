import test from 'node:test';
import assert from 'node:assert/strict';
import { managedShare } from '../js/managedKpi.js';

test('CNQL ratio counts unique online contracts with exact matching branch codes', () => {
  const rows = [
    { id: 'A', branch: 'DNG_01' },
    { id: 'A', branch: 'DNG_01' },
    { id: 'B', branch: ' dng_02 ' },
    { id: 'C', branch: 'DNG_03' },
    { id: 'D', branch: 'DNG_010' },
    { id: 'E', branch: null },
  ];
  assert.deepEqual(managedShare(rows), { count: 2, total: 5, percent: 40 });
  assert.deepEqual(managedShare([]), { count: 0, total: 0, percent: null });
  assert.deepEqual(managedShare([{ id: 'A', branch: 'DNG_03' }]), { count: 0, total: 1, percent: 0 });
});
