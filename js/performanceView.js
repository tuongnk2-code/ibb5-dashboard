const panel = document.getElementById('performance');
const button = document.getElementById('perfExpand');

if (panel && button) {
  const storageKey = 'ibb5_perf_font_size_v1';
  const mobileStorageKey = 'ibb5_perf_mobile_font_size_v1';
  const phone = window.matchMedia('(max-width:600px)');
  const decrease = document.getElementById('perfFontDecrease');
  const increase = document.getElementById('perfFontIncrease');
  let size;
  function readSize() {
    size = phone.matches ? 12 : 20;
    try { const saved = Number(localStorage.getItem(phone.matches ? mobileStorageKey : storageKey) || size); if (Number.isFinite(saved)) size = saved; } catch { /* Default size also works without local storage. */ }
    applySize(size);
  }
  function applySize(next) {
    const minimum = phone.matches ? 12 : 16;
    const maximum = phone.matches ? 24 : 32;
    size = Math.max(minimum, Math.min(maximum, next));
    document.documentElement.style.setProperty('--perf-font-size', size + 'px');
    document.documentElement.style.setProperty('--perf-table-width', (1500 * size / 20) + 'px');
    document.getElementById('perfFontSize').textContent = size + 'px';
    decrease.disabled = size <= minimum; increase.disabled = size >= maximum;
    try { localStorage.setItem(phone.matches ? mobileStorageKey : storageKey, String(size)); } catch { /* Keep the setting for this page. */ }
    window.dispatchEvent(new Event('resize'));
  }
  decrease.addEventListener('click', () => applySize(size - 2));
  increase.addEventListener('click', () => applySize(size + 2));
  readSize();
  phone.addEventListener('change', readSize);
  function setExpanded(expanded, restoreFocus = false) {
    panel.classList.toggle('perf-expanded', expanded);
    document.body.classList.toggle('perf-table-expanded', expanded);
    button.textContent = expanded ? 'Thu gọn bảng' : 'Mở rộng bảng';
    button.setAttribute('aria-expanded', String(expanded));
    window.dispatchEvent(new Event('resize'));
    if (!expanded && restoreFocus) button.focus();
  }
  button.addEventListener('click', () => setExpanded(!panel.classList.contains('perf-expanded'), true));
  document.addEventListener('keydown', event => {
    if (document.querySelector('dialog[open]')) return;
    if (event.key === 'Escape' && panel.classList.contains('perf-expanded')) { event.preventDefault(); setExpanded(false, true); }
  });
  window.addEventListener('hashchange', () => setExpanded(false));
}
