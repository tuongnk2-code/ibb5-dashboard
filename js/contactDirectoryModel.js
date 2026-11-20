export const normalizeContactText = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim();

export const CONTACT_LEVELS = [
  'Giám đốc khu vực', 'Phó giám đốc khu vực', 'Giám đốc', 'Phó giám đốc',
  'Trưởng phòng / Tương đương', 'Phó phòng', 'Trưởng nhóm / Đội trưởng',
  'Nhân sự chuyên môn', 'Chưa xác định cấp chức danh',
];

export function contactLevel(role) {
  const value = normalizeContactText(role).replace(/\b(?:truong|tuong) phong\b/g, 'truong phong');
  if (/pho giam doc|pho gd|\bpgd\b/.test(value)) return /khu vuc/.test(value) ? 1 : 3;
  if (/giam doc|\bgd\b/.test(value)) return /khu vuc/.test(value) ? 0 : 2;
  if (/pho (?:truong )?phong|\bpp\b/.test(value)) return 5;
  if (/truong phong|\btp\b|ke toan truong|truong vpgd/.test(value)) return 4;
  if (/truong nhom|doi truong|to truong/.test(value)) return 6;
  if (/^(?:cb\b|can bo\b|nhan vien\b|nhan su\b|hanh chinh\b|ke toan\b|giang vien\b|sale[s]? admin\b|ad\b|hr\b|fad\b|qtv\b|ky thuat hanh chinh\b)/.test(value)) return 7;
  return 8;
}

export function contactDepartment(role) {
  const value = normalizeContactText(role);
  if (/dvkh|dich vu khach hang|\bcs\b/.test(value)) return 'Dịch vụ khách hàng';
  if (/quan ly doi tac|tk\s*&?\s*bt|trien khai|bao tri|doi truong/.test(value)) return 'Đối tác · Triển khai';
  if (/ke toan|thu quy/.test(value)) return 'Kế toán';
  if (/hanh chinh|nhan su|hcns|\bhr\b|\bad\b|\bfad\b/.test(value)) return 'Hành chính · Nhân sự';
  if (/ky thuat|\bkt\b|ha tang/.test(value)) return 'Kỹ thuật · Hạ tầng';
  if (/\bkd\d*\b|kinh doanh|vpgd|sale/.test(value)) return 'Kinh doanh';
  return 'Bộ phận khác / Chưa rõ';
}

const compare = (a, b) => String(a).localeCompare(String(b), 'vi', { numeric: true, sensitivity: 'base' });
export function buildContactRegions(contacts, query = '') {
  const search = normalizeContactText(query), regions = new Map();
  contacts.forEach((contact, index) => {
    if (search && !normalizeContactText(contact.group).includes(search)) return;
    const group = String(contact.group || '').trim(), key = normalizeContactText(group);
    if (!regions.has(key)) regions.set(key, { key, group: group || 'Chưa ghi Phòng / Khu vực', people: [] });
    regions.get(key).people.push({ ...contact, key: String(index), level: contactLevel(contact.role), department: contactDepartment(contact.role) });
  });
  return [...regions.values()].sort((a,b) => (a.key === 'dng' ? -1 : b.key === 'dng' ? 1 : !a.key ? 1 : !b.key ? -1 : compare(a.group,b.group))).map(region => {
    region.people.sort((a,b) => a.level - b.level || compare(a.role,b.role) || compare(a.name,b.name) || Number(a.key)-Number(b.key));
    region.leaders = region.people.filter(person => person.level < 4);
    const departments = new Map();
    for (const person of region.people.filter(person => person.level >= 4)) {
      if (!departments.has(person.department)) departments.set(person.department, []);
      departments.get(person.department).push(person);
    }
    region.departments = [...departments].sort(([a],[b]) => compare(a,b)).map(([name, people]) => ({ name, people }));
    return region;
  });
}
