import './responsive.js';
import './sidebarGroups.css';

const pages = { scripts: 'Kịch bản gợi ý', regulations: 'Quy trình quy định' };

// CTV never bootstraps the operational dashboard or fetches its datasets.
export async function renderCtvView() {
  const nav = document.querySelector('#dashboardSidebar .nav');
  nav.replaceChildren();
  const links = document.createElement('div');
  links.className = 'nav-main';
  for (const [id, title] of Object.entries(pages)) {
    const link = document.createElement('a');
    link.href = '#' + id;
    link.textContent = title;
    links.append(link);
  }
  // Keep the PWA action host hidden, including buttons installed asynchronously.
  const actions = document.createElement('div');
  actions.id = 'sidebarAppActions';
  actions.hidden = true;
  nav.append(links, actions);
  document.querySelectorAll('.content > section').forEach(panel => {
    if (!Object.hasOwn(pages, panel.id)) panel.remove();
    else panel.replaceChildren();
  });
  document.querySelector('.ibb-top-subtitle')?.remove();
  document.querySelector('.top-right .tag')?.remove();
  document.querySelector('.mobile-brand')?.setAttribute('href', '#scripts');
  const loaded = new Map();
  async function activate() {
    let id = location.hash.slice(1);
    if (!Object.hasOwn(pages, id)) {
      id = 'scripts';
      history.replaceState(null, '', '#scripts');
    }
    document.querySelector('.top h1').textContent = pages[id];
    document.querySelectorAll('.content > section').forEach(panel => panel.classList.toggle('page-active', panel.id === id));
    links.querySelectorAll('a').forEach(link => {
      const current = link.hash === '#' + id;
      link.classList.toggle('active', current);
      if (current) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    if (!loaded.has(id)) {
      const root = document.getElementById(id);
      root.textContent = 'Đang tải nội dung…';
      const work = (id === 'scripts'
        ? import('./salesPlaybook.js').then(module => module.renderSalesPlaybook(root))
        : import('./regulations.js').then(module => module.renderRegulations(root)))
        .catch(() => { loaded.delete(id); root.textContent = 'Chưa tải được nội dung. Anh/chị tải lại trang để thử lại.'; });
      loaded.set(id, work);
    }
    await loaded.get(id);
  }
  window.addEventListener('hashchange', activate);
  await activate();
}
