import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyPace } from '../js/dailyPace.js';

test('daily pace uses all remaining calendar days, including Sundays, without a buffer', () => {
  assert.deepEqual(dailyPace(180, '2026-11-06'), { remaining: 24, days: 24, pace: 7.5 });
  assert.deepEqual(dailyPace(100, '2028-02-10'), { remaining: 19, days: 19, pace: 100 / 19 });
  assert.equal(dailyPace(25, '2026-11-27').pace, 25 / 3);
  assert.equal(dailyPace(25, '2026-11-28').pace, 12.5);
  assert.equal(dailyPace(25, '2026-11-30').pace, null);
  assert.equal(dailyPace(null, '2026-11-06').pace, null);
  assert.equal(dailyPace(0, '2026-11-06').pace, 0);
});
