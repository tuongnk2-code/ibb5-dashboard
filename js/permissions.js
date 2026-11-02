import { callAdminUsersApi, signOut } from './auth.js';
import { STAFF_ROSTER, ROLE_LABEL } from './staffRoster.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const accOptions = selected => '<option value="">Chọn mã Acc...</option>' + STAFF_ROSTER.map(s => '<option value="' + esc(s.acc) + '"' + (s.acc === selected ? ' selected' : '') + '>' + esc(s.name) + ' · ' + esc(s.acc) + ' · Bầy ' + s.team + '</option>').join('');

function accountCard(me) {
  return '<div class="acc-me-card">'
    + '<div><strong>' + esc(me.full_name) + '</strong><span class="acc-me-role">' + (ROLE_LABEL[me.role] || me.role) + '</span></div>'
    + '<div class="acc-me-email">' + esc(me.email) + (me.acc ? ' · Mã Acc: ' + esc(me.acc) : '') + '</div>'
    + '<button type="button" id="accLogoutBtn" class="acc-logout-btn">Đăng xuất</button>'
    + '</div>';
}

function manageSection() {
  return '<div class="acc-manage">'
    + '<div class="acc-manage-head"><h3>Quản lý tài khoản</h3><button type="button" id="accAddBtn" class="primary">+ Thêm tài khoản</button></div>'
    + '<div id="accAddForm" class="acc-form" hidden></div>'
    + '<div id="accMsg" class="acc-msg" hidden></div>'
    + '<div class="tablewrap"><table class="acc-table"><thead><tr><th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Mã Acc</th><th>Ngày tạo</th><th></th></tr></thead><tbody id="accRows"><tr><td colspan="6">Đang tải...</td></tr></tbody></table></div>'
    + '</div>';
}

function addFormHtml(initial) {
  const d = initial || {};
  const isEdit = !!d.id;
  return '<form id="accForm" class="acc-form-grid">'
    + '<label>Họ tên<input name="full_name" required value="' + esc(d.full_name || '') + '"></label>'
    + '<label>Email<input name="email" type="email" required value="' + esc(d.email || '') + '" ' + (isEdit ? 'disabled' : '') + '></label>'
    + '<label>' + (isEdit ? 'Đặt lại mật khẩu (để trống nếu không đổi)' : 'Mật khẩu tạm') + '<input name="password" type="password" ' + (isEdit ? '' : 'required') + ' minlength="6" placeholder="Tối thiểu 6 ký tự"></label>'
    + '<label>Vai trò<select name="role">'
    + '<option value="manager"' + (d.role === 'manager' ? ' selected' : '') + '>Trưởng phòng · Toàn quyền</option>'
    + '<option value="lead"' + (d.role === 'lead' ? ' selected' : '') + '>Trưởng Bầy</option>'
    + '<option value="staff"' + (!d.role || d.role === 'staff' ? ' selected' : '') + '>Nhân viên</option>'
    + '</select></label>'
    + '<label id="accAccWrap">Mã Acc<select name="acc">' + accOptions(d.acc) + '</select></label>'
    + '<div class="acc-form-actions"><button type="submit" class="primary">' + (isEdit ? 'Lưu thay đổi' : 'Tạo tài khoản') + '</button><button type="button" id="accCancelBtn">Hủy</button></div>'
    + (isEdit ? '<input type="hidden" name="id" value="' + esc(d.id) + '">' : '')
    + '</form>';
}

function wireFormRoleToggle(root) {
  const roleSel = root.querySelector('[name="role"]');
  const accWrap = root.querySelector('#accAccWrap');
  const sync = () => { accWrap.style.display = roleSel.value === 'manager' ? 'none' : ''; };
  roleSel.addEventListener('change', sync);
  sync();
}

async function loadList(root, me) {
  const tbody = root.querySelector('#accRows');
  try {
    const { profiles } = await callAdminUsersApi('GET');
    tbody.innerHTML = profiles.map(p => (
      '<tr data-id="' + esc(p.id) + '">'
      + '<td>' + esc(p.full_name) + (p.id === me.id ? ' <small>(bạn)</small>' : '') + '</td>'
      + '<td>' + esc(p.email) + '</td>'
      + '<td>' + (ROLE_LABEL[p.role] || p.role) + '</td>'
      + '<td>' + esc(p.acc || '—') + '</td>'
      + '<td>' + esc((p.created_at || '').slice(0, 10)) + '</td>'
      + '<td class="acc-row-actions"><button type="button" class="acc-edit" data-id="' + esc(p.id) + '">Sửa</button>'
      + (p.id === me.id ? '' : '<button type="button" class="acc-del" data-id="' + esc(p.id) + '">Xóa</button>')
      + '</td></tr>'
    )).join('') || '<tr><td colspan="6">Chưa có tài khoản nào.</td></tr>';
    tbody.dataset.cache = JSON.stringify(profiles);
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6">Lỗi tải danh sách: ' + esc(err.message) + '</td></tr>';
  }
}

function showMsg(root, text, isError) {
  const el = root.querySelector('#accMsg');
  el.hidden = false;
  el.textContent = text;
  el.className = 'acc-msg' + (isError ? ' acc-msg-error' : ' acc-msg-ok');
}

function openForm(root, me, initial) {
  const formHost = root.querySelector('#accAddForm');
  formHost.hidden = false;
  formHost.innerHTML = addFormHtml(initial);
  wireFormRoleToggle(formHost);
  formHost.querySelector('#accCancelBtn').addEventListener('click', () => { formHost.hidden = true; formHost.innerHTML = ''; });
  formHost.querySelector('#accForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      full_name: fd.get('full_name'),
      role: fd.get('role'),
      acc: fd.get('role') === 'manager' ? null : fd.get('acc'),
    };
    const password = fd.get('password');
    try {
      if (initial && initial.id) {
        if (password) payload.password = password;
        payload.id = initial.id;
        await callAdminUsersApi('PATCH', payload);
        showMsg(root, 'Đã cập nhật tài khoản.', false);
      } else {
        payload.email = fd.get('email');
        payload.password = password;
        await callAdminUsersApi('POST', payload);
        showMsg(root, 'Đã tạo tài khoản mới.', false);
      }
      formHost.hidden = true;
      formHost.innerHTML = '';
      await loadList(root, me);
    } catch (err) {
      showMsg(root, err.message, true);
    }
  });
}

export function renderPermissions(root, me) {
  root.innerHTML = accountCard(me) + (me.role === 'manager' ? manageSection() : '');
  root.querySelector('#accLogoutBtn').addEventListener('click', async () => {
    await signOut();
    location.reload();
  });
  if (me.role !== 'manager') return;
  loadList(root, me);
  root.querySelector('#accAddBtn').addEventListener('click', () => openForm(root, me, null));
  root.querySelector('#accRows').addEventListener('click', e => {
    const editId = e.target.dataset && e.target.classList.contains('acc-edit') ? e.target.dataset.id : null;
    const delId = e.target.dataset && e.target.classList.contains('acc-del') ? e.target.dataset.id : null;
    if (editId) {
      const cache = JSON.parse(root.querySelector('#accRows').dataset.cache || '[]');
      const row = cache.find(p => p.id === editId);
      if (row) openForm(root, me, row);
    }
    if (delId) {
      if (!confirm('Xóa tài khoản này? Không thể hoàn tác.')) return;
      callAdminUsersApi('DELETE', { id: delId })
        .then(() => { showMsg(root, 'Đã xóa tài khoản.', false); loadList(root, me); })
        .catch(err => showMsg(root, err.message, true));
    }
  });
}
