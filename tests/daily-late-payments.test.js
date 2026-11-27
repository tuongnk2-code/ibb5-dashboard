import test from 'node:test';
import assert from 'node:assert/strict';
import { confirmLatePayment, readLatePayments } from '../api/_dailyLatePayments.js';
import { latePaymentBalance, canConfirmLatePayment } from '../js/dailyLateModel.js';

test('only verified HoaNTB6 can confirm, concurrent writes conflict, new late dates remain unpaid and confirmations retain audit', async () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const hoa = { id: 'hoa', role: 'lead', acc: 'DNG.HoaNTB6' };
  const records = new Map(), profiles = [{ id: userId, role: 'staff', acc: 'DNG.ManLM3' }];
  let queries = 0;
  const admin = { from(table) {
    queries++;
    let operation = 'read', value, key, revision, select, isIn = false;
    const chain = {
      select(fields) { select = fields; return this; },
      eq(field, v) { if (field === 'key') key = v; if (field === 'revision') revision = v; return this; },
      in() { isIn = true; return this; }, gte() { return this; }, lte() { return this; }, order() { return this; }, limit() { return this; }, maybeSingle() { return this; },
      insert(row) { operation = 'insert'; value = row; return this; }, update(row) { operation = 'update'; value = row; return this; },
      then(resolve) {
        let data;
        if (table === 'profiles') data = profiles;
        else if (table === 'daily_reports') data = select === 'report_date' ? [{ report_date: '2026-11-09' }] : [{ user_id: userId, report_date: '2026-11-09', status: 'submitted', submitted_at: '2026-11-09T22:01:00+07:00' }];
        else if (operation === 'read') data = isIn ? [...records.values()] : records.get(key) || null;
        else {
          const previous = records.get(value.key);
          if (operation === 'update' && previous?.revision !== revision) data = null;
          else { data = value; records.set(value.key, value); }
        }
        return Promise.resolve({ data, error: null }).then(resolve);
      },
    }; return chain;
  } };
  const invoke = async (caller, body = {}, now = '2026-11-10T22:01:00+07:00') => {
    const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await confirmLatePayment(admin, caller, { month: '2026-11', user_id: userId, dates: ['2026-11-09', '2026-11-10'], revision: 0, ...body }, res, new Date(now)); return res;
  };
  for (const caller of [{ role: 'manager' }, { role: 'staff', acc: 'DNG.ManLM3' }, { role: 'ctv', acc: hoa.acc }]) assert.equal((await invoke(caller)).code, 403);
  assert.equal(queries, 0);
  assert.equal(canConfirmLatePayment({ ...hoa, acc: 'dng.hoantb6' }), true);
  assert.equal((await invoke(hoa, { dates: ['2026-11-08', '2026-11-09'] })).code, 409);
  const first = await invoke(hoa); assert.equal(first.code, 200);
  assert.equal(first.body.payment.updated_by, 'hoa');
  assert.equal(first.body.payment.data.confirmedBy, hoa.acc);
  assert.equal(first.body.payment.data.confirmedAt, '2026-11-10T15:01:00.000Z');
  assert.equal((await invoke(hoa)).code, 409);
  const details = ['2026-11-09', '2026-11-10', '2026-11-11'].map(date => ({ date }));
  assert.deepEqual(latePaymentBalance(details, first.body.payment), { paid: 40000, remaining: 20000 });
  const next = await invoke(hoa, { dates: details.map(item => item.date), revision: 1 }, '2026-11-11T22:01:00+07:00');
  assert.equal(next.code, 200);
  assert.equal(next.body.payment.data.confirmations.length, 2);
  assert.deepEqual(next.body.payment.data.confirmations[1].dates, ['2026-11-11']);
  assert.deepEqual(latePaymentBalance(details, next.body.payment), { paid: 60000, remaining: 0 });
  assert.equal((await readLatePayments(admin, '2026-11', [userId])).length, 1);
});
