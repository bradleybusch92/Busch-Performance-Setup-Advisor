(() => {
'use strict';
const AUTHORITATIVE_VERSION='v2026.09.30.17';
const SB_URL='https://gjlhegrcmaclikeoeonh.supabase.co';
const SB_KEY='sb_publishable_bh-dXv2tB7j-VH9qqTih6g_BAK5GCH9';
const client=window.supabase.createClient(SB_URL,SB_KEY);

function clone(v){return JSON.parse(JSON.stringify(v))}
function count(v){return Array.isArray(v?.components)?v.components.length:0}
function setVersion(){
  const el=document.getElementById('cloudVersion');
  if(el)el.textContent=AUTHORITATIVE_VERSION;
}
async function getSession(){
  const {data,error}=await client.auth.getSession();
  if(error)throw error;
  return data?.session||null;
}
async function freshCloud(){
  const sess=await getSession();
  if(!sess)throw new Error('No active login session');
  const nonce=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  const q='select=state,updated_at&user_id=eq.'+encodeURIComponent(sess.user.id)+'&limit=1&_cb='+encodeURIComponent(nonce);
  const r=await fetch(SB_URL+'/rest/v1/owner_manuals?'+q,{
    method:'GET',
    cache:'no-store',
    headers:{
      apikey:SB_KEY,
      Authorization:'Bearer '+sess.access_token,
      Accept:'application/json',
      'Cache-Control':'no-cache, no-store, max-age=0',
      Pragma:'no-cache'
    }
  });
  if(!r.ok)throw new Error('Authoritative cloud read failed: '+r.status);
  const rows=await r.json();
  return rows[0]||null;
}
function apply(row){
  if(!row?.state||!Array.isArray(row.state.components))return false;
  state=clone(row.state);
  if(!state.areaFiles||typeof state.areaFiles!=='object'||Array.isArray(state.areaFiles))state.areaFiles={};
  state.components.forEach(c=>{if(!Array.isArray(c.files))c.files=[]});
  window.__ABSTRACTION_CLOUD_BOOT=clone(state);
  window.__ABSTRACTION_CLOUD_UPDATED_AT=row.updated_at||window.__ABSTRACTION_CLOUD_UPDATED_AT||'';
  if(typeof save==='function')save();
  if(typeof renderAll==='function')renderAll();
  const area=document.getElementById('area');
  if(area&&!area.classList.contains('hidden')&&typeof renderArea==='function')renderArea();
  const sync=window.__ABSTRACTION_SYNC;
  if(sync){
    sync.baselineRaw=clone(state);
    sync.baselineCanon=null;
    sync.lastUpdatedAt=row.updated_at||sync.lastUpdatedAt||'';
    sync.lastCheckAt=Date.now();
  }
  window.__ABSTRACTION_RUNTIME_BOOT_COUNT=count(state);
  window.__ABSTRACTION_RUNTIME_FORCED_FROM_CLOUD=true;
  return true;
}
async function run(){
  setVersion();
  try{
    const row=await freshCloud();
    if(!apply(row))throw new Error('Cloud row missing usable state');
    console.info('Authoritative cloud state applied:',count(row.state),'components');
  }catch(e){
    console.warn('authoritative v17 cloud read',e);
    const boot=window.__ABSTRACTION_CLOUD_BOOT;
    if(boot&&Array.isArray(boot.components)){
      apply({state:boot,updated_at:window.__ABSTRACTION_CLOUD_UPDATED_AT||''});
      console.info('Used wrapper boot state fallback:',count(boot),'components');
    }
  }
}
run();
setTimeout(setVersion,700);
setTimeout(setVersion,2500);
setTimeout(setVersion,5500);
setTimeout(setVersion,9000);
})();