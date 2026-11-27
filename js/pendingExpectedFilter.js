import './pendingExpectedFilter.css';

const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value);
const label = value => value.split('-').reverse().join('/');
const ACTIVE = '__EXPECTED_ACTIVE__', MONTH = '__EXPECTED_MONTH__', DAYS = '__EXPECTED_DAYS__';

export function installExpectedDateFilter(select, onApply) {
  let mode = '', month = '', days = [], available = [], lastValue = '';
  const dialog = document.createElement('dialog');
  dialog.className = 'pending-expected-dialog';
  dialog.setAttribute('aria-label', 'Lọc Ngày Online dự kiến');
  dialog.innerHTML = '<form><header><h3>Lọc Ngày Online dự kiến</h3><button type="button" data-expected-cancel aria-label="Đóng">×</button></header><label data-expected-month-wrap>Chọn tháng<input type="month" data-expected-month></label><fieldset data-expected-days><legend>Chọn các ngày muốn xem</legend><div data-expected-day-list></div></fieldset><footer><button type="button" data-expected-clear>Tất cả ngày</button><button type="button" data-expected-cancel>Hủy</button><button type="submit">Áp dụng</button></footer></form>';
  document.body.append(dialog);
  const monthInput = dialog.querySelector('[data-expected-month]'), dayList = dialog.querySelector('[data-expected-day-list]');
  function open(nextMode) {
    dialog.dataset.mode = nextMode;
    dialog.querySelector('[data-expected-month-wrap]').hidden = nextMode !== 'month';
    dialog.querySelector('[data-expected-days]').hidden = nextMode !== 'days';
    monthInput.value = month || available[0]?.slice(0, 7) || '';
    dayList.replaceChildren();
    for (const day of [...new Set([...available, ...days])].sort()) {
      const wrap = document.createElement('label'), input = document.createElement('input');
      input.type = 'checkbox'; input.value = day; input.checked = days.includes(day);
      wrap.append(input, document.createTextNode(label(day))); dayList.append(wrap);
    }
    if (!dayList.children.length) dayList.textContent = 'Chưa có ngày dự kiến trong danh sách hiện tại.';
    dialog.showModal();
  }
  function apply() { lastValue = mode ? ACTIVE : ''; if(mode&&!select.querySelector('option[value="'+ACTIVE+'"]'))select.add(new Option('Đang lọc',ACTIVE)); select.value=lastValue; dialog.close(); onApply(); select.focus(); }
  select.addEventListener('change', event => {
    if ([MONTH, DAYS, ACTIVE].includes(select.value)) {
      event.stopPropagation(); open(select.value === MONTH ? 'month' : select.value === DAYS ? 'days' : mode); return;
    }
    mode = ''; month = ''; days = []; lastValue = select.value;
  });
  dialog.querySelector('form').onsubmit = event => {
    event.preventDefault();
    mode = dialog.dataset.mode;
    if (mode === 'month') { month = monthInput.value; days = []; if (!month) mode = ''; }
    else { days = [...dayList.querySelectorAll('input:checked')].map(input => input.value); month = ''; if (!days.length) mode = ''; }
    apply();
  };
  dialog.querySelectorAll('[data-expected-cancel]').forEach(button => button.onclick = () => dialog.close());
  dialog.querySelector('[data-expected-clear]').onclick = () => { mode = ''; month = ''; days = []; apply(); };
  dialog.addEventListener('close', () => { select.value = mode ? ACTIVE : lastValue; });
  return {
    get active() { return !!mode; },
    matches(value) { return mode === 'month' ? value.slice(0, 7) === month : days.includes(value); },
    decorate(values, previous) {
      available = [...new Set(values.filter(validDate))].sort();
      for (const value of [MONTH, DAYS, ACTIVE]) select.querySelector(`option[value="${value}"]`)?.remove();
      select.add(new Option('Chọn tháng…', MONTH), 3);
      select.add(new Option('Chọn nhiều ngày…', DAYS), 4);
      if (mode) select.add(new Option(mode === 'month' ? 'Tháng ' + month.slice(5) + '/' + month.slice(0, 4) : days.length + ' ngày đã chọn', ACTIVE), 5);
      lastValue = mode ? ACTIVE : previous;
    },
    clear() { mode = ''; month = ''; days = []; lastValue = ''; },
  };
}
