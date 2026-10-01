(() => {
'use strict';
const BRIDGE_VERSION='v2026.09.30.17';
const SB_URL='https://gjlhegrcmaclikeoeonh.supabase.co';
const SB_KEY='sb_publishable_bh-dXv2tB7j-VH9qqTih6g_BAK5GCH9';
const BUCKET='owner-manual-files';
const client=window.supabase.createClient(SB_URL,SB_KEY);
let saving=false;

function clone(v){return JSON.parse(JSON.stringify(v))}
function canon(v){
  const q=x=>Array.isArray(x)?x.map(q):x&&typeof x==='object'?Object.keys(x).sort().reduce((o,k)=>(o[k]=q(x[k]),o),{}):x;
  return JSON.stringify(q(v));
}
function byId(id){return document.getElementById(id)}
function notify(msg,ms=1800){
  let el=byId('cloudToast')||byId('toast');
  if(!el){el=document.createElement('div');el.id='cloudToast';el.className='cloudToast';document.body.appendChild(el)}
  el.textContent=msg;el.classList.add('show');
  clearTimeout(window.__abstractionBridgeToastTimer);
  window.__abstractionBridgeToastTimer=setTimeout(()=>el?.classList.remove('show'),ms);
}
function setVersion(){
  const el=byId('cloudVersion');
  if(el)el.textContent=BRIDGE_VERSION;
}
async function getSession(){
  const {data,error}=await client.auth.getSession();
  if(error)throw error;
  return data?.session||null;
}
function markConfirmed(row){
  if(!row?.state)return;
  window.__ABSTRACTION_CLOUD_BOOT=clone(row.state);
  window.__ABSTRACTION_CLOUD_UPDATED_AT=row.updated_at||window.__ABSTRACTION_CLOUD_UPDATED_AT||'';
  const sync=window.__ABSTRACTION_SYNC;
  if(sync){
    sync.baselineRaw=clone(row.state);
    sync.baselineCanon=null;
    sync.lastUpdatedAt=row.updated_at||sync.lastUpdatedAt||'';
    sync.lastCheckAt=Date.now();
  }
  const status=byId('cloudSyncStatus');
  if(status)status.textContent=`Saved to cloud: ${Array.isArray(row.state.components)?row.state.components.length:0} components.`;
}
async function directSave(){
  if(saving)return false;
  saving=true;
  try{
    const sess=await getSession();
    if(!sess){notify('Sign in again to save to cloud.',2600);return false}
    if(typeof save==='function')save();
    state.__cloudSavedAt=new Date().toISOString();
    if(typeof save==='function')save();
    const outgoing=clone(state);
    const nonce=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
    const url=SB_URL+'/rest/v1/owner_manuals?on_conflict=user_id&select=state%2Cupdated_at&_cb='+encodeURIComponent(nonce);
    const r=await fetch(url,{
      method:'POST',
      cache:'no-store',
      headers:{
        apikey:SB_KEY,
        Authorization:'Bearer '+sess.access_token,
        'Content-Type':'application/json',
        Accept:'application/vnd.pgrst.object+json',
        Prefer:'resolution=merge-duplicates,return=representation',
        'Cache-Control':'no-cache, no-store, max-age=0',
        Pragma:'no-cache'
      },
      body:JSON.stringify({user_id:sess.user.id,state:outgoing})
    });
    const text=await r.text();
    if(!r.ok)throw new Error('Cloud write failed '+r.status+': '+text.slice(0,240));
    const row=JSON.parse(text);
    if(!row?.state||canon(row.state)!==canon(outgoing))throw new Error('Cloud returned a different state than was sent.');
    state=row.state;
    if(typeof save==='function')save();
    markConfirmed(row);
    notify('✓ Saved to cloud',1500);
    return true;
  }catch(e){
    console.warn('direct cloud save',e);
    notify('Cloud save failed. Changes remain in this browser.',3200);
    return false;
  }finally{
    saving=false;
  }
}
window.__abstractionDirectSave=directSave;

function renderAfterComponentChange(){
  if(typeof renderAll==='function')renderAll();
  const area=byId('area');
  if(area&&!area.classList.contains('hidden')&&typeof renderArea==='function')renderArea();
}
async function cleanupFiles(paths){
  if(!paths?.length)return;
  try{await client.storage.from(BUCKET).remove(paths)}catch(e){console.warn('component file cleanup',e)}
}

document.addEventListener('click',async e=>{
  const btn=e.target?.closest?.('#cloudBottomSave,#cloudSetupSave');
  if(!btn)return;
  e.preventDefault();
  e.stopImmediatePropagation();
  const oldText=btn.textContent;
  btn.disabled=true;
  btn.textContent='Saving…';
  await directSave();
  btn.disabled=false;
  btn.textContent=oldText||'Save';
},true);

document.addEventListener('submit',async e=>{
  const form=e.target;
  if(form?.id!=='editForm')return;
  e.preventDefault();
  e.stopImmediatePropagation();
  const names=['id','title','location','system','type','manufacturer','partNumber','summary','specs','service','notes','rule','source','link'];
  const c={};
  names.forEach(k=>c[k]=byId(k)?.value||'');
  if(!c.title.trim())return;
  if(!c.id)c.id='e'+Date.now();
  const i=(state.components||[]).findIndex(x=>x.id===c.id);
  if(i>=0){
    const existing=state.components[i];
    c.files=Array.isArray(existing?.files)?existing.files:[];
    state.components[i]=c;
  }else{
    c.files=[];
    state.components.push(c);
  }
  if(typeof save==='function')save();
  byId('editDlg')?.close();
  renderAfterComponentChange();
  if(typeof toast==='function')toast('Component saved');
  await directSave();
},true);

document.addEventListener('click',async e=>{
  const btn=e.target?.closest?.('#deleteBtn');
  if(!btn)return;
  e.preventDefault();
  e.stopImmediatePropagation();
  const id=byId('id')?.value||'';
  if(!id)return;
  const c=(state.components||[]).find(x=>x.id===id);
  if(!c)return;
  if(!confirm(`Delete "${c.title}"?`))return;
  const files=Array.isArray(c.files)?c.files.map(x=>x.path).filter(Boolean):[];
  state.components=state.components.filter(x=>x.id!==id);
  if(typeof save==='function')save();
  byId('editDlg')?.close();
  renderAfterComponentChange();
  if(typeof toast==='function')toast('Component deleted');
  const ok=await directSave();
  if(ok)cleanupFiles(files);
},true);

setVersion();
setTimeout(setVersion,600);
setTimeout(setVersion,2200);
setTimeout(setVersion,5000);
setTimeout(setVersion,8000);
})();