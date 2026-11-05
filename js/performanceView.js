const panel = document.getElementById('performance');
const button = document.getElementById('perfExpand');

if (panel && button) {
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
    if (event.key === 'Escape' && panel.classList.contains('perf-expanded')) { event.preventDefault(); setExpanded(false, true); }
  });
  window.addEventListener('hashchange', () => setExpanded(false));
}
