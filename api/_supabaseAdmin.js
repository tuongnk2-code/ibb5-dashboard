import { createClient } from '@supabase/supabase-js';

let client = null;

export function getSupabaseAdmin() {
  if (client) return client;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trên server.');
  }
  client = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  return client;
}

export async function requireManager(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return { error: 'Thiếu phiên đăng nhập.', status: 401 };
  }
  const admin = getSupabaseAdmin();
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) {
    return { error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.', status: 401 };
  }
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, role, email, full_name, acc')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (profileError || !profile) {
    return { error: 'Không tìm thấy hồ sơ tài khoản.', status: 403 };
  }
  if (profile.role !== 'manager') {
    return { error: 'Chỉ Trưởng phòng mới có quyền quản lý tài khoản.', status: 403 };
  }
  return { admin, caller: profile };
}
