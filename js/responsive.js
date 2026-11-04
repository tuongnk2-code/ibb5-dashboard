const sidebar = document.getElementById('dashboardSidebar');
const toggle = document.getElementById('mobileMenuToggle');
const backdrop = document.getElementById('mobileMenuBackdrop');
const main = document.querySelector('#appShell > main');
const mobile = window.matchMedia('(max-width: 1000px)');

function setMenu(open, restoreFocus = false) {
  open = open && mobile.matches;
  document.body.classList.toggle('mobile-nav-open', open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.textContent = open ? '✕ Đóng' : '☰ Menu';
  backdrop.hidden = !open;
  sidebar.inert = mobile.matches && !open;
  main.inert = open;
  if (open) (sidebar.querySelector('.nav a.active') || sidebar.querySelector('.nav a'))?.focus();
  else if (restoreFocus && mobile.matches) toggle.focus();
}
toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true', true));
backdrop.addEventListener('click', () => setMenu(false, true));
sidebar.addEventListener('click', event => { if (event.target.closest('.nav a')) setMenu(false, true); });
document.addEventListener('keydown', event => {
  if (!document.body.classList.contains('mobile-nav-open')) return;
  if (event.key === 'Escape') { setMenu(false, true); return; }
  if (event.key !== 'Tab') return;
  const focusable = [toggle, ...sidebar.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled])')].filter(el => el.getClientRects().length);
  const index = focusable.indexOf(document.activeElement);
  if (event.shiftKey && index <= 0) { event.preventDefault(); focusable.at(-1)?.focus(); }
  else if (!event.shiftKey && (index === focusable.length - 1 || index === -1)) { event.preventDefault(); toggle.focus(); }
});
mobile.addEventListener('change', () => setMenu(false));
window.addEventListener('hashchange', () => setMenu(false));
setMenu(false);

// Tables without their own scroll area keep their original columns on small screens.
const content = document.querySelector('.content');
const scrollAreas = '.tablewrap,.pending-scroll,.pending-schedule-scroll,.ct-tablewrap,.dp-scroll,.ibbc-scroll,.dr-table-scroll,.responsive-table-scroll';
function prepareTables(node) {
  if (!(node instanceof Element)) return;
  const tables = node.matches('table') ? [node] : node.querySelectorAll('table');
  for (const table of tables) {
    if (table.closest(scrollAreas)) continue;
    const overflow = getComputedStyle(table.parentElement).overflowX;
    if (overflow === 'auto' || overflow === 'scroll') continue;
    const wrapper = document.createElement('div');
    wrapper.className = 'responsive-table-scroll';
    table.before(wrapper); wrapper.append(table);
  }
}
prepareTables(content);
new MutationObserver(records => {
  for (const record of records) for (const node of record.addedNodes) prepareTables(node);
}).observe(content, { childList: true, subtree: true });
