import test from 'node:test';
import assert from 'node:assert/strict';
import { unpackState, monthKey, validateSnapshot, mergeStateRows } from '../js/dashboardStateModel.js';

test('shared dashboard API migrates once, enforces ownership and detects concurrent writes', async () => {
  const oldFetch = globalThis.fetch;
  process.env.SUPABASE_URL = 'https://sync.test'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';
  const rows = new Map(); let caller = { id: 'manager', role: 'manager', acc: null };
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(input instanceof Request ? input.url : input), method = init.method || 'GET';
    const json = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
    if (url.pathname === '/auth/v1/user') return json({ id: caller.id });
    if (url.pathname === '/rest/v1/profiles') return json(caller);
    if (url.pathname !== '/rest/v1/dashboard_shared_state') throw Error(url.pathname);
    const filter = url.searchParams.get('key'), key = filter?.slice(3);
    if (method === 'GET' && filter?.startsWith('in.')) {
      const keys = filter.slice(4,-1).split(',').map(value=>value.replace(/^"|"$/g,''));
      return json(keys.map(key=>rows.get(key)).filter(Boolean));
    }
    if (method === 'GET') return json(key ? rows.get(key) || null : [...rows.values()]);
    const value = JSON.parse(init.body);
    if (Array.isArray(value)) { for (const row of value) if (!rows.has(row.key)) rows.set(row.key, row); return new Response(null, { status: 201 }); }
    if (method === 'PATCH' && rows.get(key)?.revision !== Number(url.searchParams.get('revision')?.slice(3))) return json(null);
    rows.set(value.key, value); return json(value);
  };
  try {
    const { default: handler } = await import('../api/dashboard-sync.js');
    const invoke = async (method, body, authorized = true, query = {}) => {
      const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } };
      await handler({ method, headers: authorized ? { authorization: 'Bearer test' } : {}, query, body }, res); return res;
    };
    assert.equal((await invoke('GET', null, false)).code, 401);
    const snapshot = { data: [{ id: 'NET1', type: 'Internet', staff: 'DNG.ManLM3', created: '2026-11-01', date: '2026-11-04' }], meta: {} };
    assert.equal((await invoke('POST', { kind: 'migrate', snapshot, notes: { NET1: { expected: '2026-11-05', action: 'Hẹn KH' } } })).code, 200);
    const first = (await invoke('GET')).body;
    assert.equal(first.snapshot.data[0].id, 'NET1'); assert.equal(first.notes.NET1.action, 'Hẹn KH');
    // An old device must never replace a record already stored in the cloud.
    await invoke('POST', { kind: 'migrate', snapshot: { ...snapshot, data: [{ ...snapshot.data[0], id: 'OLD' }] } });
    assert.equal((await invoke('GET')).body.snapshot.data[0].id, 'NET1');
    caller = { id: 'staff', role: 'staff', acc: 'DNG.ManLM3' };
    assert.equal((await invoke('POST', { kind: 'snapshot', snapshot, revision: 1 })).code, 403);
    assert.equal((await invoke('POST', { kind: 'commit', month: '2026-11', action: 'approve', acc: caller.acc, revision: 0 })).code, 403);
    assert.equal((await invoke('POST', { kind: 'commit', month: '2026-11', action: 'submit', acc: 'DNG.Other', value: 10, revision: 0 })).code, 403);
    const note = { expected: '2026-11-06', timeSlot: 'Sáng', action: 'Hẹn KH', result: 'Chờ', source: 'Zalo' };
    assert.equal((await invoke('POST', { kind: 'pending', id: 'NET1', value: note, revision: 1 })).code, 200);
    assert.equal((await invoke('POST', { kind: 'pending', id: 'NET1', value: note, revision: 1 })).code, 409);
    caller = { id: 'other', role: 'staff', acc: 'DNG.Other' };
    assert.equal((await invoke('POST', { kind: 'pending', id: 'NET1', value: note, revision: 2 })).code, 403);
    caller = { id: 'staff', role: 'staff', acc: 'DNG.ManLM3' };
    assert.equal((await invoke('POST', { kind: 'commit', month: '2026-11', action: 'submit', acc: caller.acc, value: 40, revision: 0 })).code, 200);
    caller = { id: 'manager', role: 'manager' };
    assert.equal((await invoke('POST', { kind: 'commit', month: '2026-11', action: 'approve', acc: 'DNG.ManLM3', revision: 1 })).code, 200);
    const mobile = (await invoke('GET')).body;
    assert.equal(mobile.commitments['2026-11'].__ALL__.staff['DNG.ManLM3'].status, 'approved');
    assert.equal(mobile.notes.NET1.expected, '2026-11-06');
    assert.equal(mobile.snapshot.data[0].date, '2026-11-04');
    assert.equal(mobile.revisions[monthKey('2026-11')], 2);
    const versions = await invoke('GET',null,true,{versions:'1'});
    assert.equal(versions.body.revisions['pending:NET1'],2);
    const changed = await invoke('GET',null,true,{keys:JSON.stringify(['pending:NET1'])});
    assert.equal(changed.code,200);assert.deepEqual(changed.body.rows.map(row=>row.key),['pending:NET1']);
    assert.equal((await invoke('GET',null,false,{keys:'["snapshot"]'})).code,401);
    assert.equal((await invoke('GET',null,true,{keys:'invalid'})).code,400);
    assert.equal((await invoke('GET',null,true,{keys:JSON.stringify(Array(101).fill('snapshot'))})).code,400);
    // Cancellation approval is a server-owned flag; staff updates cannot forge it.
    caller = { id: 'staff', role: 'staff', acc: 'DNG.ManLM3' };
    assert.equal((await invoke('POST',{kind:'cancelPending',id:'NET1',revision:2})).code,403);
    assert.equal((await invoke('POST',{kind:'pending',id:'NET1',revision:2,value:{...note,cancellationApproved:true}})).code,200);
    assert.equal((await invoke('GET')).body.notes.NET1.cancellationApproved,undefined);
    caller = { id: 'lead', role: 'lead', acc: 'DNG.HoaNTB6' };
    assert.equal((await invoke('POST',{kind:'cancelPending',id:'NET1',revision:3})).code,403);
    caller = { id: 'manager', role: 'manager' };
    assert.equal((await invoke('POST',{kind:'cancelPending',id:'NET1',revision:2})).code,409);
    assert.equal((await invoke('POST',{kind:'cancelPending',id:'MISSING',revision:0})).code,403);
    assert.equal((await invoke('POST',{kind:'cancelPending',id:'NET1',revision:3})).code,200);
    const approved=(await invoke('GET')).body;
    assert.equal(approved.notes.NET1.cancellationApproved,true);
    assert.equal(approved.notes.NET1.cancellationApprovedBy,'manager');
    assert.ok(Date.parse(approved.notes.NET1.cancellationApprovedAt));
    assert.equal(approved.notes.NET1.action,note.action);
    assert.equal(approved.snapshot.data[0].id,'NET1');
    caller = { id: 'staff', role: 'staff', acc: 'DNG.ManLM3' };
    assert.equal((await invoke('POST',{kind:'pending',id:'NET1',revision:4,value:note})).code,409);
    assert.equal((await invoke('GET')).body.notes.NET1.cancellationApproved,true);
  } finally { globalThis.fetch = oldFetch; delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY; }
});

test('live merging never replaces a successful local write with an older response',()=>{
  const state=unpackState([{key:'pending:NET1',revision:3,data:{action:'Latest local save'}},{key:'snapshot',revision:1,data:{data:[],meta:{}}}]);
  const stale=mergeStateRows(state,[{key:'pending:NET1',revision:2,data:{action:'Older response'}}],{'pending:NET1':2});
  assert.equal(stale.state.notes.NET1.action,'Latest local save');assert.deepEqual(stale.changed,[]);
  const next=mergeStateRows(state,[{key:'pending:NET2',revision:1,data:{action:'New row'}},{key:'pending:NET1',revision:4,data:{action:'New remote save'}}]);
  assert.equal(next.state.notes.NET1.action,'New remote save');assert.equal(next.state.notes.NET2.action,'New row');
  assert.equal(next.state.snapshot,state.snapshot);
});

test('snapshot validation and month keys reject malformed records', () => {
  assert.throws(() => monthKey('2026-13'));
  assert.throws(() => validateSnapshot({ data: [{ type: 'Internet', id: 'NET', date: '2026-02-30' }] }));
  assert.equal(unpackState([]).snapshot, null);
});
