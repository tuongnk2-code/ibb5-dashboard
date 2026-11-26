import { getSession } from './auth.js';
import './regulations.css';

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const element = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
};
export async function renderRegulations(root) {
  root.replaceChildren(element('p', 'Đang tải quy trình…', 'note'));
  try {
    const session = await getSession();
    if (!session?.access_token) throw Error('Anh cần đăng nhập để xem quy trình.');
    const response = await fetch('/api/regulations', { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) throw Error(payload.error || 'Chưa tải được quy trình.');
    const doc = payload.document;
    if (!Array.isArray(doc?.sections)) throw Error('Nội dung tài liệu chưa hợp lệ.');
    root.replaceChildren();
    const head = element('div', null, 'qr-head'), titles = element('div');
    titles.append(element('span', 'QMS · FPT TELECOM', 'qr-source'), element('h2', doc.title), element('p', `${doc.code} · Phiên bản ${doc.version} · Hiệu lực: ${doc.effective}`, 'qr-meta'));
    const source = element('a', 'Đối chiếu bản gốc ↗', 'qr-original');
    source.href = 'https://qms.fpt.com/document-detail/3bae0044-2454-41e1-a864-3bc34b1e4b27/view';
    source.target = '_blank'; source.rel = 'noopener noreferrer';
    head.append(titles, source);
    const tools = element('div', null, 'qr-tools'), search = element('input'), category = element('select'), reset = element('button', 'Đặt lại');
    search.type = 'search'; search.placeholder = 'Tìm nội dung: hoa hồng, hủy cũ, KHTN…'; search.setAttribute('aria-label', 'Tìm trong quy trình');
    category.setAttribute('aria-label', 'Mục quy trình');
    const all = element('option', 'Tất cả nội dung'); all.value = ''; category.append(all);
    doc.sections.forEach(section => { const option = element('option', section.title); option.value = section.id; category.append(option); });
    reset.type = 'button'; tools.append(search, category, reset);
    const count = element('p', null, 'qr-count'); count.setAttribute('role', 'status'); count.setAttribute('aria-live', 'polite');
    const list = element('div', null, 'qr-sections');
    root.append(head, element('p', `Nội dung tổng hợp từ ${doc.pages} trang · Đối chiếu ngày ${doc.reviewedAt.split('-').reverse().join('/')} · Không tự đồng bộ khi QMS thay đổi.`, 'qr-meta'), tools, count, list);
    function render() {
      const query = normalize(search.value.trim());
      const sections = doc.sections.filter(s => (!category.value || s.id === category.value) && (!query || normalize(JSON.stringify(s)).includes(query)));
      list.replaceChildren(); count.textContent = `${sections.length} / ${doc.sections.length} mục`;
      if (!sections.length) list.append(element('p', 'Chưa tìm thấy nội dung phù hợp.', 'qr-empty'));
      sections.forEach(section => {
        const details = element('details', null, 'qr-section'); details.open = true;
        const summary = element('summary'); summary.append(element('span', section.title), element('small', `Trang ${section.page}`)); details.append(summary);
        const body = element('div', null, 'qr-body');
        (section.paragraphs || []).forEach(text => body.append(element('p', text)));
        if (section.bullets?.length) { const list = element('ul'); section.bullets.forEach(text => list.append(element('li', text))); body.append(list); }
        if (section.rows?.length) {
          const scroll = element('div', null, 'qr-table-scroll'), table = element('table'), thead = element('thead'), tr = element('tr');
          (section.columns || []).forEach(text => { const th = element('th', text); th.scope = 'col'; tr.append(th); }); thead.append(tr); table.append(thead);
          const tbody = element('tbody'); section.rows.forEach(row => { const tr = element('tr'); row.forEach(text => tr.append(element('td', text))); tbody.append(tr); }); table.append(tbody); scroll.append(table); body.append(scroll);
        }
        (section.after || []).forEach(text => body.append(element('p', text)));
        details.append(body); list.append(details);
      });
    }
    search.addEventListener('input', render); category.addEventListener('change', render);
    reset.onclick = () => { search.value = ''; category.value = ''; render(); };
    render();
  } catch (error) {
    root.replaceChildren(element('p', error.message, 'note'));
    const retry = element('button', 'Thử lại'); retry.type = 'button'; retry.onclick = () => renderRegulations(root); root.append(retry);
  }
}
