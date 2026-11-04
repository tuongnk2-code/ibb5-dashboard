import test from 'node:test';
import assert from 'node:assert/strict';
import { onlineCameraContracts, netWithOnlineCamera } from '../js/cameraKpi.js';

test('Camera Online uses current Camera source, including sales without a new NET contract', () => {
  const cam = (id, date, room = 'IBB5') => ({ type: 'Camera', id, date, room });
  const data = [cam('NEW', '2026-11-04'), cam('NEW', '2026-11-04'), cam('CAM_ONLY', '2026-11-02'),
    cam('OLD', '2026-10-30'), cam('PENDING', ''), cam('FUTURE', '2026-11-05'),
    cam('INVALID', '2026-02-30'), cam('OTHER', '2026-11-03', 'IBB6'),
    { type: 'Internet', id: 'NET_ONLY', date: '2026-11-04', room: 'IBB5' }];
  assert.deepEqual(onlineCameraContracts(data, '2026-11-01', '2026-11-04', 'IBB5').map(r => r.id), ['NEW', 'CAM_ONLY']);
  assert.equal(onlineCameraContracts(data, '2026-11-01', '2026-11-04').length, 3);
});

test('bundled NET requires matching online Camera in active data and excludes future or pending services', () => {
  const net = [{ id: 'A', date: '2026-11-03' }, { id: 'A', date: '2026-11-03' },
    { id: 'B', date: '2026-11-03' }, { id: 'C', date: '' }, { id: 'D', date: '2026-11-05' }];
  const data = [{ type: 'Camera', id: ' a ', date: '2026-11-04' },
    { type: 'Camera', id: 'B', date: '2026-11-05' }, { type: 'Camera', id: 'C', date: '2026-11-02' },
    { type: 'Camera', id: 'D', date: '2026-11-02' }];
  assert.deepEqual(netWithOnlineCamera(net, data, '2026-11-04').map(r => r.id), ['A']);
  assert.deepEqual(netWithOnlineCamera(net, [], '2026-11-04'), []);
});
