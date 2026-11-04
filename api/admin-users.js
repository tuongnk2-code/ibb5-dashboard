import { requireManager } from './_supabaseAdmin.js';
import { usernameToEmail } from '../js/loginIdentity.js';

const ROLES = ['manager', 'lead', 'staff'];

function bad(res, status, message) {
  res.status(status).json({ error: message });
}

export default async function handler(req, res) {
  const auth = await requireManager(req);
  if (auth.error) return bad(res, auth.status, auth.error);
  const { admin } = auth;

  if (req.method === 'GET') {
    const { data, error } = await admin.from('profiles').select('id, email, full_name, role, acc, created_at').order('created_at', { ascending: true });
    if (error) return bad(res, 500, error.message);
    return res.status(200).json({ profiles: data });
  }

  if (req.method === 'POST') {
    const { username, password, full_name, role, acc } = req.body || {};
    if (!username || !password || !full_name || !role) return bad(res, 400, 'Thiếu tên đăng nhập, mật khẩu, họ tên hoặc vai trò.');
    let email;
    try {
      email = usernameToEmail(username);
    } catch (err) {
      return bad(res, 400, err.message);
    }
    if (!ROLES.includes(role)) return bad(res, 400, 'Vai trò không hợp lệ.');
    if (role !== 'manager' && !acc) return bad(res, 400, 'Trưởng Bầy và Nhân viên cần chọn mã Acc.');
    if (password.length < 6) return bad(res, 400, 'Mật khẩu cần tối thiểu 6 ký tự.');

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError) return bad(res, 400, ['email_exists', 'user_already_exists'].includes(createError.code)
      ? 'Tên đăng nhập đã được sử dụng. Vui lòng chọn tên khác.' : createError.message);

    const { error: profileError } = await admin.from('profiles').insert({
      id: created.user.id,
      email,
      full_name,
      role,
      acc: role === 'manager' ? null : acc,
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return bad(res, 400, profileError.message);
    }
    return res.status(200).json({ ok: true, id: created.user.id });
  }

  if (req.method === 'PATCH') {
    const { id, full_name, role, acc, password } = req.body || {};
    if (!id) return bad(res, 400, 'Thiếu id tài khoản.');
    if (role && !ROLES.includes(role)) return bad(res, 400, 'Vai trò không hợp lệ.');
    if (role && role !== 'manager' && !acc) return bad(res, 400, 'Trưởng Bầy và Nhân viên cần chọn mã Acc.');

    if (password) {
      if (password.length < 6) return bad(res, 400, 'Mật khẩu cần tối thiểu 6 ký tự.');
      const { error: pwError } = await admin.auth.admin.updateUserById(id, { password });
      if (pwError) return bad(res, 400, pwError.message);
    }

    const update = {};
    if (full_name) update.full_name = full_name;
    if (role) { update.role = role; update.acc = role === 'manager' ? null : acc; }
    if (Object.keys(update).length) {
      const { error: updateError } = await admin.from('profiles').update(update).eq('id', id);
      if (updateError) return bad(res, 400, updateError.message);
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return bad(res, 400, 'Thiếu id tài khoản.');
    if (id === auth.caller.id) return bad(res, 400, 'Không thể tự xoá chính tài khoản đang đăng nhập.');
    const { error: deleteError } = await admin.auth.admin.deleteUser(id);
    if (deleteError) return bad(res, 400, deleteError.message);
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
  return bad(res, 405, 'Method not allowed');
}
