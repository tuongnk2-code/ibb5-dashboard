import './sidebarGroups.css';

export function installSidebarGroups() {
  const sidebar = document.getElementById('dashboardSidebar');
  const groups = [...sidebar.querySelectorAll('[data-nav-group]')];
  const links = [...sidebar.querySelectorAll('.nav a[href^="#"]')];
  const sync = id => {
    const current = links.find(link => link.hash === '#' + id);
    const activeGroup = current?.closest('[data-nav-group]');
    groups.forEach(group => {
      group.open = group === activeGroup;
      group.classList.toggle('has-active', group === activeGroup);
    });
    links.forEach(link => {
      if (link === current) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  };
  groups.forEach(group => group.addEventListener('toggle', () => {
    if (group.open) groups.forEach(other => { if (other !== group) other.open = false; });
  }));
  return { sync };
}
