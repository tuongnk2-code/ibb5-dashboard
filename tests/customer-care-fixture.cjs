const MANAGER='11111111-1111-4111-8111-111111111111',STAFF='22222222-2222-4222-8222-222222222222',OTHER='33333333-3333-4333-8333-333333333333',LEAD='44444444-4444-4444-8444-444444444444';
exports.ids={MANAGER,STAFF,OTHER,LEAD};
exports.fixture=async()=>{
  const {createCustomerCareHandler}=await import('../api/customer-care.js');
  const people=[{id:MANAGER,role:'manager',acc:'DNG.Manager',full_name:'Trưởng phòng'},{id:STAFF,role:'staff',acc:'DNG.ChuongHM',full_name:'Minh Chương'},{id:OTHER,role:'staff',acc:'DNG.ManLM3',full_name:'Lê Minh Mẫn'},{id:LEAD,role:'lead',acc:'DNG.Vypv',full_name:'Trưởng Bầy 1'}];
  const contracts=[{id:'A1',staff:'DNG.ChuongHM',customer:'Nguyễn Khách A',type:'Internet',created:'2026-11-01',date:'2026-11-02'},{id:'A2',staff:'DNG.ChuongHM',customer:'Khách <img src=x onerror=alert(1)>',type:'Internet',created:'2026-11-01',date:''},{id:'B1',staff:'DNG.ManLM3',customer:'Khách B',type:'Internet',created:'2026-11-01',date:''}];
  const tables={profiles:people,dashboard_shared_state:[{key:'snapshot',data:{data:contracts}}],care_contacts:[{contract_id:'A2',phone:'0990000002',consent:true,note:'',revision:1},{contract_id:'B1',phone:'0990000003',consent:true,note:'',revision:1}],care_campaigns:[],care_results:[]};
  class Query{
    constructor(name){this.name=name;this.filters=[];this.mode='select';this.sort=[];}
    select(){return this;}eq(k,v){this.filters.push(r=>r[k]===v);return this;}in(k,v){this.filters.push(r=>v.includes(r[k]));return this;}
    order(k,{ascending=true}={}){this.sort.push([k,ascending]);return this;}range(a,b){this.start=a;this.end=b;return this;}
    insert(value){this.mode='insert';this.value=value;return this;}update(value){this.mode='update';this.value=value;return this;}
    maybeSingle(){this.one=true;return this;}single(){this.one=true;return this;}
    then(resolve,reject){try{
      let rows=tables[this.name].filter(r=>this.filters.every(fn=>fn(r)));
      if(this.mode==='insert'){
        const row={...this.value};if(this.name==='care_campaigns')Object.assign(row,{round:1,revision:1,status:'active',created_at:new Date().toISOString()},this.value);
        const keys=this.name==='care_results'?['campaign_id','round','contract_id']:this.name==='care_contacts'?['contract_id']:['id'];
        if(tables[this.name].some(r=>keys.every(k=>r[k]===row[k])))return resolve({data:null,error:{code:'23505'}});
        tables[this.name].push(row);rows=[row];
      }else if(this.mode==='update'){rows.forEach(r=>Object.assign(r,this.value));}
      for(const [key,asc] of [...this.sort].reverse())rows.sort((a,b)=>String(a[key]).localeCompare(String(b[key]))*(asc?1:-1));
      if(this.start!=null)rows=rows.slice(this.start,this.end+1);
      resolve({data:structuredClone(this.one?rows[0]||null:rows),error:null});
    }catch(error){reject(error);}}
  }
  const admin={from:name=>new Query(name)};
  const handler=createCustomerCareHandler(async req=>{const caller=people.find(p=>p.id===req.headers.authorization?.slice(7));return caller?{caller,admin}:{error:'Thiếu phiên đăng nhập.',status:401};});
  const request=async(id,method='GET',body)=>{let status=200,payload,headers={};const res={setHeader:(k,v)=>headers[k]=v,status:s=>{status=s;return res;},json:v=>{payload=v;return res;}};await handler({method,headers:{authorization:id?'Bearer '+id:''},body},res);return {status,body:payload,headers};};
  return {request,tables,people,contracts};
};
