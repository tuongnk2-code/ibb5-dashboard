const panel = document.getElementById('performance');
const button = document.getElementById('perfExpand');

if (panel && button) {
  const storageKey = 'ibb5_perf_font_size_v1';
  const decrease = document.getElementById('perfFontDecrease');
  const increase = document.getElementById('perfFontIncrease');
  let size = 20;
  try { const saved = Number(localStorage.getItem(storageKey) || 20); if (Number.isFinite(saved)) size = saved; } catch { /* Default size also works without local storage. */ }
  function applySize(next) {
    size = Math.max(16, Math.min(32, next));
    document.documentElement.style.setProperty('--perf-font-size', size + 'px');
    document.documentElement.style.setProperty('--perf-table-width', (1500 * size / 20) + 'px');
    document.getElementById('perfFontSize').textContent = size + 'px';
    decrease.disabled = size <= 16; increase.disabled = size >= 32;
    try { localStorage.setItem(storageKey, String(size)); } catch { /* Keep the setting for this page. */ }
    window.dispatchEvent(new Event('resize'));
  }
  decrease.addEventListener('click', () => applySize(size - 2));
  increase.addEventListener('click', () => applySize(size + 2));
  applySize(size);
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
