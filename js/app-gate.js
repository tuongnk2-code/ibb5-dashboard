import { getSession, signIn, signOut, fetchMyProfile } from './auth.js';

const loginScreen = document.getElementById('loginScreen');
const appShell = document.getElementById('appShell');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const loginSubmitBtn = loginForm.querySelector('button[type="submit"]');
const logoutTopBtn = document.getElementById('topLogoutBtn');

function showLogin(message) {
  appShell.style.display = 'none';
  loginScreen.style.display = 'flex';
  if (message) {
    loginError.textContent = message;
    loginError.hidden = false;
  } else {
    loginError.hidden = true;
  }
}

async function showApp(profile) {
  const { bootstrapDashboardSync, installSyncControls } = await import('./dashboardSync.js');
  await bootstrapDashboardSync(profile);
  loginScreen.style.display = 'none';
  appShell.style.display = '';
  window.IBB5_CURRENT_PROFILE = profile;
  await import('./main.js');
  installSyncControls();
  const reportRoot = document.getElementById('dailyReportsRoot');
  if (reportRoot) {
    const { renderDailyReports } = await import('./dailyReports.js');
    renderDailyReports(reportRoot, profile, (month, acc) => window.IBB5_MONTHLY_TARGET?.(month, acc) ?? null);
  }
  const root = document.getElementById('accountPanelRoot');
  if (root) {
    const { renderPermissions } = await import('./permissions.js');
    renderPermissions(root, profile);
  }
}

async function boot() {
  let session;
  try {
    session = await getSession();
  } catch (err) {
    showLogin('Không kết nối được máy chủ. Thử lại sau.');
    return;
  }
  if (!session) {
    showLogin();
    return;
  }
  let profile;
  try {
    profile = await fetchMyProfile();
  } catch (err) {
    showLogin('Không tải được hồ sơ tài khoản. Thử lại.');
    return;
  }
  if (!profile) {
    await signOut();
    showLogin('Tài khoản chưa được cấp quyền truy cập. Liên hệ Trưởng phòng.');
    return;
  }
  try { await showApp(profile); } catch (err) { showLogin(err.message || 'Không tải được dữ liệu đồng bộ. Vui lòng thử lại.'); }
}

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  loginSubmitBtn.disabled = true;
  loginError.hidden = true;
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  try {
    await signIn(email, password);
    const profile = await fetchMyProfile();
    if (!profile) {
      await signOut();
      throw new Error('Tài khoản chưa được cấp quyền truy cập. Liên hệ Trưởng phòng.');
    }
    await showApp(profile);
  } catch (err) {
    showLogin(err.message || 'Đăng nhập thất bại.');
  } finally {
    loginSubmitBtn.disabled = false;
  }
});

logoutTopBtn?.addEventListener('click', async () => {
  await signOut();
  location.reload();
});

boot();
