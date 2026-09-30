(() => {
'use strict';
const CLOUD_VERSION='v2026.09.29.9';
const CLOUD_SB_URL='https://gjlhegrcmaclikeoeonh.supabase.co';
const CLOUD_SB_KEY='sb_publishable_bh-dXv2tB7j-VH9qqTih6g_BAK5GCH9';
const CLOUD_SYSTEMS=['Engine','Fuel System','Cooling','Exhaust','Electrical','Instrumentation','Drivetrain','Suspension','Steering','Brakes','Wheels & Tires','Controls','Safety','Chassis / Body','General / Miscellaneous'];
const CLOUD_TYPES=['Purchased Component','Modified Purchased Component','Custom Component'];
let cloudClient=null,cloudSession=null,cloudSaving=false;
const ce=id=>document.getElementById(id);

function cloudToast(msg,d=1500){
  let el=ce('cloudToast');
  if(!el){el=document.createElement('div');el.id='cloudToast';el.className='cloudToast';document.body.appendChild(el)}
  el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),d);
}
function cloudCanon(x){
  const q=v=>Array.isArray(v)?v.map(q):v&&typeof v==='object'?Object.keys(v).sort().reduce((o,k)=>(o[k]=q(v[k]),o),{}):v;
  return JSON.stringify(q(x));
}
async function cloudEnsureSession(){
  if(cloudSession)return cloudSession;
  if(!cloudClient)cloudClient=window.supabase.createClient(CLOUD_SB_URL,CLOUD_SB_KEY);
  const {data}=await cloudClient.auth.getSession();
  cloudSession=data.session;
  return cloudSession;
}
async function cloudSave(){
  if(cloudSaving)return false;
  const sess=await cloudEnsureSession();
  if(!sess){cloudToast('Sign in again to save to cloud.',2200);return false}
  cloudSaving=true;
  try{
    if(typeof save==='function')save();
    state.__cloudSavedAt=new Date().toISOString();
    save();
    const outgoing=JSON.parse(JSON.stringify(state));
    const {data,error}=await cloudClient.from('owner_manuals').upsert({user_id:sess.user.id,state:outgoing},{onConflict:'user_id'}).select('state,updated_at').single();
    if(error||!data||cloudCanon(data.state)!==cloudCanon(outgoing)){
      cloudToast('Cloud save failed. Changes were not confirmed.',2600);return false;
    }
    state=data.state;
    save();
    cloudToast('✓ Saved to cloud',1400);
    return true;
  }finally{cloudSaving=false}
}
async function cloudReloadFromServer(){
  const sess=await cloudEnsureSession();if(!sess)return false;
  const {data,error}=await cloudClient.from('owner_manuals').select('state,updated_at').eq('user_id',sess.user.id).maybeSingle();
  if(error||!data?.state)return false;
  state=data.state;save();renderAll();
  if(!ce('area').classList.contains('hidden')&&typeof renderArea==='function')renderArea();
  cloudTopActive();
  return true;
}
function cloudTopActive(){
  const homeVisible=!ce('visual').classList.contains('hidden')&&!ce('home').classList.contains('hidden')&&ce('area').classList.contains('hidden');
  const systemsVisible=!ce('systems').classList.contains('hidden');
  const indexVisible=!ce('index').classList.contains('hidden');
  document.querySelectorAll('#cloudTopNav button').forEach(b=>{
    const p=b.dataset.page;
    b.classList.toggle('active',(p==='visual'&&homeVisible)||(p==='systems'&&systemsVisible)||(p==='index'&&indexVisible));
  });
}
function cloudGoHome(){
  show('visual');
  ce('area').classList.add('hidden');
  ce('home').classList.remove('hidden');
  window.scrollTo(0,0);
  cloudTopActive();
}
function cloudEnsureOption(sel,value){
  if(!sel||!value)return;
  if(![...sel.options].some(o=>o.value===value))sel.add(new Option(value,value));
}
function cloudConvertSelect(id,options){
  const old=ce(id);
  if(!old)return null;
  if(old.tagName==='SELECT'){
    options.forEach(v=>cloudEnsureOption(old,v));
    return old;
  }
  const sel=document.createElement('select');
  sel.id=id;sel.name=old.name||'';sel.className=old.className||'';
  sel.innerHTML='<option value=""></option>'+options.map(v=>`<option value="${v.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}">${v}</option>`).join('');
  const cur=old.value||'';cloudEnsureOption(sel,cur);sel.value=cur;old.replaceWith(sel);return sel;
}
function cloudSetupControls(){
  const pane=ce('setupPane');if(!pane)return;
  let ctl=ce('cloudFieldEditControls');
  if(!ctl){
    ctl=document.createElement('div');ctl.id='cloudFieldEditControls';
    ctl.innerHTML='<span id="cloudSaveConfirm" aria-live="polite"></span><div class="cloudSetupActions"><button type="button" class="btn" id="cloudFieldEditToggle">Edit Fields</button><button type="button" class="btn primary" id="cloudSetupSave">Save</button></div>';
    pane.appendChild(ctl);
    ce('cloudFieldEditToggle').onclick=()=>{
      const editing=!document.body.classList.contains('cloudFieldEditMode');
      document.body.classList.toggle('cloudFieldEditMode',editing);
      ce('cloudFieldEditToggle').textContent=editing?'Done Editing':'Edit Fields';
    };
    ce('cloudSetupSave').onclick=async()=>{
      const b=ce('cloudSetupSave');b.disabled=true;b.textContent='Saving to cloud…';
      const ok=await cloudSave();
      b.disabled=false;b.textContent='Save';
      if(ok){const c=ce('cloudSaveConfirm');c.textContent='✓ Saved';c.classList.add('show');setTimeout(()=>c?.classList.remove('show'),1100)}
    };
  }else{
    const b=ce('cloudFieldEditToggle');if(b)b.textContent=document.body.classList.contains('cloudFieldEditMode')?'Done Editing':'Edit Fields';
  }
}
async function cloudBuildUI(){
  if(!cloudClient)cloudClient=window.supabase.createClient(CLOUD_SB_URL,CLOUD_SB_KEY);
  await cloudEnsureSession();

  const oldHeader=document.querySelector('header');if(oldHeader)oldHeader.style.display='none';
  const oldNav=document.querySelector('.nav');if(oldNav)oldNav.style.display='none';
  document.querySelector('.footer')?.style.setProperty('display','none');
  document.querySelector('.carTitle')?.style.setProperty('display','none');
  if(ce('areaDesc'))ce('areaDesc').style.display='none';
  if(ce('addHere'))ce('addHere').style.display='none';
  document.querySelector('.profiles .hint')?.style.setProperty('display','none');

  let top=ce('cloudTopbar');
  if(!top){
    top=document.createElement('div');top.id='cloudTopbar';top.className='cloudTopbar';
    top.innerHTML='<img class="cloudTopLogo" src="abstraction-logo-white.svg?v=20260929-2145-v9" alt="Abstraction"><div class="cloudTopNav" id="cloudTopNav"><button type="button" data-page="visual">Main Menu</button><button type="button" data-page="systems">Systems</button><button type="button" data-page="index">Component Index</button></div><button type="button" class="cloudTopAdd" id="cloudTopAdd">+ Add Component</button>';
    document.body.prepend(top);
    document.querySelectorAll('#cloudTopNav button').forEach(b=>b.onclick=async()=>{
      const p=b.dataset.page;
      if(p==='visual'){const ok=await cloudSave();if(ok)cloudGoHome()}
      else{show(p);cloudTopActive()}
    });
    ce('cloudTopAdd').onclick=()=>edit(null);
  }

  const head=document.querySelector('#home .panelHead > div');
  if(head){head.classList.add('cloudMainHead');const bold=head.querySelector('b');if(bold)bold.textContent='MAIN MENU'}

  if(ce('back'))ce('back').textContent='← Main Menu';

  cloudConvertSelect('system',CLOUD_SYSTEMS);
  cloudConvertSelect('type',CLOUD_TYPES);

  if(!window.__cloudEditWrapped){
    window.__cloudEditWrapped=true;
    const originalEdit=edit;
    edit=function(c){
      const s=cloudConvertSelect('system',CLOUD_SYSTEMS),t=cloudConvertSelect('type',CLOUD_TYPES);
      cloudEnsureOption(s,c?.system||'');cloudEnsureOption(t,c?.type||'');
      originalEdit(c);
    };
  }
  if(!window.__cloudRenderSetupWrapped){
    window.__cloudRenderSetupWrapped=true;
    const originalRenderSetup=renderSetup;
    renderSetup=function(){originalRenderSetup();cloudSetupControls()};
  }
  cloudSetupControls();

  if(!window.__cloudShowWrapped){
    window.__cloudShowWrapped=true;
    const originalShow=show;
    show=function(p){const r=originalShow(p);setTimeout(cloudTopActive,0);return r};
  }

  document.querySelectorAll('.zone').forEach(z=>z.addEventListener('click',()=>setTimeout(cloudTopActive,0)));
  ce('back')?.addEventListener('click',()=>setTimeout(cloudTopActive,0));

  let bottom=ce('cloudBottom');
  if(!bottom){
    bottom=document.createElement('div');bottom.id='cloudBottom';
    bottom.innerHTML='<span id="cloudBottomEmail"></span><button type="button" class="btn" id="cloudExport">Export</button><button type="button" class="btn" id="cloudImport">Import</button><button type="button" class="btn" id="cloudBottomSave">Save</button><button type="button" class="btn" id="cloudSignOut">Sign Out</button>';
    ce('home').appendChild(bottom);
    ce('cloudExport').onclick=()=>ce('exportBtn')?.click();
    ce('cloudImport').onclick=()=>ce('importBtn')?.click();
    ce('cloudBottomSave').onclick=async()=>{const b=ce('cloudBottomSave');b.disabled=true;b.textContent='Saving…';await cloudSave();b.disabled=false;b.textContent='Save'};
    ce('cloudSignOut').onclick=async()=>{await cloudClient.auth.signOut();location.reload()};
  }
  ce('cloudBottomEmail').textContent=cloudSession?.user?.email||'Not signed in';

  if(!ce('cloudVersion')){const v=document.createElement('div');v.id='cloudVersion';v.className='cloudVersion';v.textContent=CLOUD_VERSION;document.body.appendChild(v)}

  if(!window.__cloudComponentBound){
    window.__cloudComponentBound=true;
    ce('editForm')?.addEventListener('submit',()=>setTimeout(cloudSave,100));
    ce('deleteBtn')?.addEventListener('click',()=>setTimeout(cloudSave,140));
  }

  cloudTopActive();
}
window.addEventListener('pageshow',async e=>{if(e.persisted){await cloudReloadFromServer();await cloudBuildUI()}});
cloudBuildUI();
})();