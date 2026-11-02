/** Replace these read functions with Supabase queries when the backend is ready.
 * Keep the returned record fields unchanged so existing renderers keep working.
 * Example: const { data, error } = await supabase.from('contracts').select('*');
 * if (error) throw error; return data;
 */
import { mockDATA, mockIBB_NET_META, mockIBB_CAM_META, mockIBB_TV_META, mockNET_LATEST, CONTACT_DATA } from './mockData.js';
export async function fetchContracts() { return structuredClone(mockDATA); }
export async function fetchContractMetadata() { return structuredClone(mockIBB_NET_META); }
export async function fetchCameraMetadata() { return structuredClone(mockIBB_CAM_META); }
export async function fetchTelevisionMetadata() { return structuredClone(mockIBB_TV_META); }
export async function fetchLatestInternetContracts() { return structuredClone(mockNET_LATEST); }
export async function fetchContacts() { return structuredClone(CONTACT_DATA); }
export async function fetchDashboardData() {
  const [mockDATA, mockIBB_NET_META, mockIBB_CAM_META, mockIBB_TV_META, mockNET_LATEST, CONTACT_DATA] = await Promise.all([
    fetchContracts(), fetchContractMetadata(), fetchCameraMetadata(), fetchTelevisionMetadata(), fetchLatestInternetContracts(), fetchContacts()
  ]);
  return { mockDATA, mockIBB_NET_META, mockIBB_CAM_META, mockIBB_TV_META, mockNET_LATEST, CONTACT_DATA };
}
