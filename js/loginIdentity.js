// Supabase password authentication uses an email internally. This reserved,
// non-deliverable domain keeps username accounts separate from real emails.
const USERNAME_DOMAIN = '@username.ibb5.invalid';
export const USERNAME_PATTERN = '[a-zA-Z0-9][a-zA-Z0-9._\\-]{2,31}';

export function normalizeUsername(value) {
  const username = String(value ?? '').trim().toLowerCase();
  if (!new RegExp('^' + USERNAME_PATTERN + '$').test(username)) {
    throw new Error('Tên đăng nhập cần 3–32 ký tự: chữ không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang; bắt đầu bằng chữ hoặc số.');
  }
  return username;
}

export function usernameToEmail(value) {
  return normalizeUsername(value) + USERNAME_DOMAIN;
}

export function loginToEmail(value) {
  const login = String(value ?? '').trim();
  return login.includes('@') ? login : usernameToEmail(login);
}

export function displayLogin(email) {
  const value = String(email ?? '');
  return value.endsWith(USERNAME_DOMAIN) ? value.slice(0, -USERNAME_DOMAIN.length) : value;
}
