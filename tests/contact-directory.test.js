import test from 'node:test';
import assert from 'node:assert/strict';
import { buildContactRegions, contactLevel, contactDepartment } from '../js/contactDirectoryModel.js';

test('corporate title order handles deputy, combined roles, accountants and source spelling variants',()=>{
  const ordered=['Giám đốc Khu vực','Phó Giám đốc Khu vực','Giám đốc Chi nhánh','Phó Giám đốc & TP KT','Trưởng phòng KT','Phó trưởng phòng kỹ thuật INF','Đội trưởng TKBT','Nhân viên CS','Quản lý'];
  assert.deepEqual(ordered.map(contactLevel),[0,1,2,3,4,5,6,7,8]);
  for(const title of ['Trường Phòng KD 4','Tưởng Phòng DVKH','TP Tổng Hợp & Kế toán trưởng','Kế toán trưởng/thủ quỹ','Trưởng VPGD Cam Ranh'])assert.equal(contactLevel(title),4,title);
  assert.equal(contactLevel('Phó Phòng DVKH (tt)'),5);
  assert.equal(contactLevel('Trưởng nhóm HCNS'),6);
  assert.equal(contactLevel(''),8);
});

test('directory conserves contacts and original values while sorting titles within each department',()=>{
  const source=[
    {name:'Đội',group:'DNG',role:'Đội trưởng',note:'Block A',source:'TIN'},
    {name:'Phó',group:'DNG',role:'Phó Giám đốc & TP KT'},
    {name:'Trưởng',group:'DNG',role:'Trưởng phòng Quản lý đối tác 1'},
    {name:'Giám đốc',group:'DNG',role:'Giám đốc Chi nhánh'},
    {name:'Nhân viên',group:'GLI',role:'Nhân viên CS'},
    {name:'Chưa rõ',group:null,role:'Quản lý'},
    {name:'Trùng tên',group:'DNG',role:'Đội trưởng'},
    {name:'Trùng tên',group:'DNG',role:'Đội trưởng'},
  ];
  const original=structuredClone(source),regions=buildContactRegions(source);
  assert.equal(regions.flatMap(r=>r.people).length,source.length);
  assert.equal(new Set(regions.flatMap(r=>r.people.map(p=>p.key))).size,source.length);
  assert.deepEqual(regions[0].leaders.map(p=>p.name),['Giám đốc','Phó']);
  assert.deepEqual(regions[0].departments[0].people.map(p=>p.level),[4,6,6,6]);
  assert.equal(regions.at(-1).people[0].role,'Quản lý');
  assert.deepEqual(source,original);
  assert.equal(contactDepartment('Trưởng nhóm HCNS'),'Hành chính · Nhân sự');
  assert.equal(contactDepartment('Trưởng phòng DVKH'),'Dịch vụ khách hàng');
});

test('region search only matches displayed region and keeps missing titles and contacts available',()=>{
  const source=[{name:'GLI',group:'DNG',section:'GLI',sheet:'GLI',role:''},{name:'Another',group:'GLI',role:'Giám Đốc'}];
  assert.equal(buildContactRegions(source,' gli ')[0].people[0].name,'Another');
  assert.equal(buildContactRegions(source,'DNG')[0].people[0].level,8);
  assert.equal(buildContactRegions(source,'missing').length,0);
});
