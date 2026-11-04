import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyPace } from '../js/dailyPace.js';

test('daily pace includes Sundays and subtracts a three-day buffer', () => {
  assert.deepEqual(dailyPace(180, '2026-11-06'), { remaining: 24, days: 21, pace: 180 / 21 });
  assert.deepEqual(dailyPace(100, '2028-02-10'), { remaining: 19, days: 16, pace: 6.25 });
  for (const date of ['2026-11-27', '2026-11-28', '2026-11-30']) {
    assert.equal(dailyPace(25, date).pace, 25);
  }
  assert.equal(dailyPace(null, '2026-11-06').pace, null);
  assert.equal(dailyPace(0, '2026-11-06').pace, 0);
});
