(() => {
'use strict';
const SYNC_VERSION='v2026.09.30.17';
const SB_URL='https://gjlhegrcmaclikeoeonh.supabase.co';
const SB_KEY='sb_publishable_bh-dXv2tB7j-VH9qqTih6g_BAK5GCH9';
const sync=window.__ABSTRACTION_SYNC||(window.__ABSTRACTION_SYNC={version:SYNC_VERSION});
const client=window.supabase.createClient(SB_URL,SB_KEY);

function clone(v){return JSON.parse(JSON.stringify(v))}
function normalize(v){
  const x=clone(v||{});
  if(!x.areaFiles||typeof x.areaFiles!=='object'||Array.isArray(x.areaFiles))x.areaFiles={};
  if(!Array.isArray(x.components))x.components=[];
  x.components.forEach(c=>{if(!Array.isArray(c.files))c.files=[]});
  return x;
}
function canon(v){
  const q=x=>Array.isArray(x)?x.map(q):x&&typeof x==='object'?Object.keys(x).sort().reduce((o,k)=>(o[k]=q(x[k]),o),{}):x;
  return JSON.stringify(q(normalize(v)));
}
function count(v){return Array.isArray(v?.components)?v.components.length:0}
function notify(msg,ms=2600){
  const el=document.getElementById('toast');
  if(el){
    el.textContent=msg;el.classList.add('show');
    clearTimeout(window.__abstractionSyncToastTimer);
    window.__abstractionSyncToastTimer=setTimeout(()=>el.classList.remove('show'),ms);
  }else console.log(msg);
}
function setVersion(){
  const v=document.getElementById('cloudVersion');
  if(v&&v.textContent!==SYNC_VERSION)v.textContent=SYNC_VERSION;
}
function setBaseline(row){
  if(!row?.state)return;
  sync.baselineCanon=canon(row.state);
  sync.baselineRaw=clone(row.state);
  sync.lastUpdatedAt=row.updated_at||'';
}
function baselineCanon(){
  if(sync.baselineCanon)return sync.baselineCanon;
  sync.baselineCanon=canon(sync.baselineRaw||window.__ABSTRACTION_CLOUD_BOOT||state||{});
  return sync.baselineCanon;
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
    cache:'no-store',
    headers:{apikey:SB_KEY,Authorization:'Bearer '+sess.access_token,Accept:'application/json','Cache-Control':'no-cache, no-store, max-age=0','Pragma':'no-cache'}
  });
  if(!r.ok)throw new Error('Cloud read failed: '+r.status);
  const rows=await r.json();
  return rows[0]||null;
}
function applyCloud(row,message){
  if(!row?.state)return false;
  state=normalize(row.state);
  window.__ABSTRACTION_CLOUD_BOOT=clone(state);
  window.__ABSTRACTION_CLOUD_UPDATED_AT=row.updated_at||window.__ABSTRACTION_CLOUD_UPDATED_AT||'';
  if(typeof save==='function')save();
  if(typeof renderAll==='function')renderAll();
  const area=document.getElementById('area');
  if(area&&!area.classList.contains('hidden')&&typeof renderArea==='function')renderArea();
  setBaseline(row);
  const status=document.getElementById('cloudSyncStatus');
  if(status)status.textContent=`Cloud loaded: ${count(state)} components.`;
  if(message)notify(message);
  return true;
}
async function checkCloud({manual=false,silent=false}={}){
  if(sync.checking)return false;
  sync.checking=true;
  try{
    const row=await freshCloud();
    if(!row?.state){
      if(manual&&!silent)notify('No cloud Owner\'s Manual was found.');
      return false;
    }
    const remote=canon(row.state);
    const local=canon(state);
    const base=baselineCanon();
    if(remote===local){
      setBaseline(row);
      const status=document.getElementById('cloudSyncStatus');
      if(status)status.textContent=`Up to date: ${count(row.state)} components.`;
      if(manual&&!silent)notify(`Already up to date • ${count(row.state)} components`);
      return true;
    }
    const localChanged=local!==base;
    const cloudChanged=remote!==base;
    if(manual){
      if(localChanged){
        const ok=confirm('This browser has local changes that are not confirmed to match the cloud. Reloading from cloud will replace those local changes. Continue?');
        if(!ok)return false;
      }
      return applyCloud(row,`Reloaded from cloud • ${count(row.state)} components`);
    }
    if(!localChanged&&cloudChanged){
      return applyCloud(row,`Updated from cloud • ${count(row.state)} components`);
    }
    if(localChanged&&cloudChanged&&!silent){
      notify('Cloud data changed while this browser also has local changes. Use Account → Reload from Cloud if you want the cloud copy.',4200);
    }
    return false;
  }catch(e){
    console.warn('cloud sync check',e);
    if(manual&&!silent)notify('Could not reload current cloud data.',3000);
    return false;
  }finally{
    sync.checking=false;
    sync.lastCheckAt=Date.now();
  }
}
async function autoCheck(){
  if(document.visibilityState==='hidden')return;
  if(Date.now()-(sync.lastCheckAt||0)<3500)return;
  await checkCloud({manual:false,silent:false});
}
function installAccountControl(){
  const dlg=document.getElementById('cloudAccountDlg');
  const body=dlg?.querySelector('.cloudAccountBody');
  const status=document.getElementById('cloudAccountStatus');
  if(!dlg||!body||document.getElementById('cloudSyncSection'))return false;
  const sec=document.createElement('section');
  sec.id='cloudSyncSection';
  sec.className='cloudAccountSection';
  sec.innerHTML=`
    <div class="cloudAccountSectionTitle">Cloud Sync</div>
    <div class="cloudAccountHelp">Supabase is the source of truth. Use this if a browser appears to be showing an older copy.</div>
    <button type="button" class="btn primary" id="cloudReloadFromCloud">Reload from Cloud</button>
    <div id="cloudSyncStatus" class="cloudAccountHelp"></div>`;
  if(status)body.insertBefore(sec,status);else body.appendChild(sec);
  document.getElementById('cloudReloadFromCloud').onclick=async()=>{
    const b=document.getElementById('cloudReloadFromCloud');
    b.disabled=true;b.textContent='Reloading…';
    await checkCloud({manual:true,silent:false});
    b.disabled=false;b.textContent='Reload from Cloud';
  };
  return true;
}

window.__abstractionCloudReload=()=>checkCloud({manual:true,silent:false});
window.__abstractionCloudCheck=()=>checkCloud({manual:false,silent:false});

if(!installAccountControl()){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(installAccountControl()||tries>=30)clearInterval(timer);
  },150);
}

document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(autoCheck,120)});
window.addEventListener('focus',()=>setTimeout(autoCheck,160));
window.addEventListener('pageshow',()=>setTimeout(autoCheck,220));
setTimeout(()=>checkCloud({manual:false,silent:true}),1000);

setVersion();
setTimeout(setVersion,700);
setTimeout(setVersion,2200);
setTimeout(setVersion,4500);
setTimeout(setVersion,7200);
})();