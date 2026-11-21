const b64=value=>typeof value==='string'&&/^[A-Za-z0-9_-]+$/.test(value);
export function validPushEndpoint(value){
 try{const url=new URL(value);return value.length<=2048&&url.protocol==='https:'&&(!url.port||url.port==='443')&&!url.username&&!url.password&&!url.hash&&(url.hostname==='fcm.googleapis.com'||url.hostname==='updates.push.services.mozilla.com'||url.hostname.endsWith('.push.apple.com')||url.hostname.endsWith('.notify.windows.com'));}catch{return false;}
}
export function validatePushSubscription(value){
 if(!value||!validPushEndpoint(value.endpoint)||!b64(value.keys?.p256dh)||!b64(value.keys?.auth)||value.keys.p256dh.length!==87||value.keys.auth.length!==22)throw Error('Thông tin đăng ký thông báo không hợp lệ.');
 return {endpoint:value.endpoint,p256dh:value.keys.p256dh,auth:value.keys.auth};
}
