import { supabase } from './supabaseClient.js';

const PAGE_SIZE = 1000;

async function fetchAll(table, columns) {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

function toMap(rows) {
  const map = {};
  for (const { id, ...rest } of rows) map[id] = rest;
  return map;
}

export async function fetchContracts() {
  return fetchAll('contracts', 'type, id, date, created, room, staff, status, package, branch');
}

export async function fetchContractMetadata() {
  return toMap(await fetchAll('contract_net_meta', 'id, prepaid, created, date, staff, customer, source'));
}

export async function fetchCameraMetadata() {
  return toMap(await fetchAll('contract_cam_meta', 'id, date, created'));
}

export async function fetchTelevisionMetadata() {
  return toMap(await fetchAll('contract_tv_meta', 'id, date, vvip'));
}

export async function fetchLatestInternetContracts() {
  return toMap(await fetchAll('net_latest', 'id, customer, staff, created'));
}

export async function fetchContacts() {
  return fetchAll('contacts', 'source, sheet, group:group_name, section, name, role, email, phone, ext, note');
}

export async function fetchDashboardData() {
  const [mockDATA, mockIBB_NET_META, mockIBB_CAM_META, mockIBB_TV_META, mockNET_LATEST, CONTACT_DATA] = await Promise.all([
    fetchContracts(), fetchContractMetadata(), fetchCameraMetadata(), fetchTelevisionMetadata(), fetchLatestInternetContracts(), fetchContacts()
  ]);
  return { mockDATA, mockIBB_NET_META, mockIBB_CAM_META, mockIBB_TV_META, mockNET_LATEST, CONTACT_DATA };
}
