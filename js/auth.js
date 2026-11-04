import { supabase } from './supabaseClient.js';
import { loginToEmail } from './loginIdentity.js';

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signIn(login, password) {
  const email = loginToEmail(login);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function fetchMyProfile() {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return null;
  const { data, error } = await supabase.from('profiles').select('id, email, full_name, role, acc').eq('id', user.id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function callAdminUsersApi(method, body) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
  const res = await fetch('/api/admin-users', {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
    body: method === 'GET' ? undefined : JSON.stringify(body || {}),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.error || 'Yêu cầu thất bại.');
  return payload;
}
