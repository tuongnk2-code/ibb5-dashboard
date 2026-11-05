// Restore the focused field and text cursor after a live table redraw.
export function rememberFocus(root) {
  const active = document.activeElement;
  if (!active || !root?.contains(active)) return () => {};
  let selector;
  if (active.id) selector = '#' + CSS.escape(active.id);
  else if (active.dataset.goal) selector = '[data-goal="' + CSS.escape(active.dataset.goal) + '"]';
  else if (active.dataset.plan) selector = '[data-plan="' + CSS.escape(active.dataset.plan) + '"]';
  else {
    const row = active.closest('tr[data-id]'), field = [...active.classList].find(name => ['p-date','p-time-slot','p-note','p-result','p-source'].includes(name));
    if (row && field) selector = 'tr[data-id="' + CSS.escape(row.dataset.id) + '"] .' + field;
  }
  const start = active.selectionStart, end = active.selectionEnd;
  return () => {
    const field = selector && root.querySelector(selector);
    if (!field || field.disabled) return;
    field.focus({ preventScroll: true });
    if (typeof start === 'number') try { field.setSelectionRange(start, end); } catch { /* Date/select inputs have no text selection. */ }
  };
}
