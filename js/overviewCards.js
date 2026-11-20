import './overviewCards.css';

const icons = {
  growth: '<path d="m4 16 5-5 4 3 7-9M15 5h5v5"/><path d="M4 4v16h16"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="m12 12 8-8m-4 0h4v4"/>',
  pending: '<path d="M5 4h11l3 3v13H5zM15 4v4h4M8 11h5M8 15h3"/><circle cx="17" cy="17" r="4"/><path d="M17 15v2l1 1"/>',
  activity: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
  calendar: '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 10h16m-12 4h3m-3 3h6"/>',
  sold: '<path d="M5 8h14l1 12H4zM8 8V6a4 4 0 0 1 8 0v2"/>',
  online: '<path d="M3 8a14 14 0 0 1 18 0M6 12a9 9 0 0 1 12 0m-9 4a4 4 0 0 1 6 0"/><circle cx="12" cy="20" r="1"/>',
  progress: '<circle cx="12" cy="12" r="8"/><path d="m8 12 3 3 5-6"/>',
  aged: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2M12 3v1"/>',
  tv: '<rect x="3" y="7" width="18" height="13" rx="3"/><path d="m8 3 4 4 4-4m-7 9 2 4 2-4"/>',
  camera: '<path d="M4 6h12v10H4zM16 9l5-3v10l-5-3M8 20h7m-3-4v4"/><circle cx="9" cy="11" r="2"/>',
  payment: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18m-14 5h4m5-1 1 1 2-2"/>',
  branch: '<path d="M3 21V8l9-5 9 5v13M8 21v-6h8v6M7 9h2m6 0h2M7 12h2m6 0h2"/>',
  staff: '<circle cx="9" cy="7" r="3"/><path d="M3 20v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/>',
};

export function installOverviewCards() {
  const metrics = [
    ['growth','growth','blue'],['remainingDailyOnline','target','blue'],
    ['pending','pending','amber'],['pace','activity','blue'],['previousDayOnline','calendar','purple'],
    ['soldToday','sold','amber'],['todayOnlineCount','online','blue'],
    ['todayOnline','target','blue'],['dailyProgress','progress','green'],
    ['aged','aged','red'],['vvip','tv','purple'],['cameraKpi','camera','blue'],
    ['pnRate','payment','green'],['managed','branch','blue'],['staffProductivity','staff','purple'],
  ];
  for (const [id,icon,tone] of metrics) {
    const card=document.getElementById(id)?.closest('.mini');
    if(!card||card.classList.contains('ov-metric'))continue;
    card.classList.add('ov-metric');card.dataset.tone=tone;
    const name=card.querySelector('.name');
    name.textContent=name.textContent.replace(/^[▤◎↗◉]\s*/, '');
    const symbol=document.createElement('span');symbol.className='ov-metric-icon';symbol.setAttribute('aria-hidden','true');
    symbol.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" focusable="false">'+icons[icon]+'</svg>';
    name.after(symbol);
  }
  const focus=document.querySelector('#overview .overview-focus');
  const support=document.querySelector('#overview .overview-support');
  if(focus&&support){
    const row=document.createElement('div');row.className='overview-five';
    row.setAttribute('role','group');row.setAttribute('aria-label','Năm chỉ số theo dõi kinh doanh');
    focus.before(row);
    for(const group of [focus,support]){
      row.append(...group.children);
      group.remove();
    }
  }
}
