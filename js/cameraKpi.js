import { validDay } from './dailyReportModel.js';

const contractId = row => String(row.id || '').trim().toUpperCase();
const onlineBy = (row, asOf) => contractId(row) && validDay(row.date) && row.date <= asOf;

// Read the active source, including newly imported Camera contracts.
export function onlineCameraContracts(data, start, asOf, room = '') {
  return [...new Map(data.filter(row => row.type === 'Camera' && onlineBy(row, asOf)
    && row.date >= start && (!room || row.room === room)).map(row => [contractId(row), row])).values()];
}

// Bundled NET is separate from Camera sales: both services must be online.
export function netWithOnlineCamera(netRows, data, asOf) {
  const cameraIds = new Set(data.filter(row => row.type === 'Camera' && onlineBy(row, asOf)).map(contractId));
  return [...new Map(netRows.filter(row => onlineBy(row, asOf) && cameraIds.has(contractId(row)))
    .map(row => [contractId(row), row])).values()];
}
