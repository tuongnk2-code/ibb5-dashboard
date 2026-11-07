// August 2026 was supplied only to reconcile payroll carryovers. Retain it in
// shared source storage for LCB, but exclude it from other dashboard reports.
export const includeInDashboardReports = row => String(row?.created || row?.date || '').slice(0, 7) !== '2026-08';
