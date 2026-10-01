(() => {
'use strict';
const CLOUD_VERSION='v2026.09.30.14';
const CLOUD_SB_URL='https://gjlhegrcmaclikeoeonh.supabase.co';
const CLOUD_SB_KEY='sb_publishable_bh-dXv2tB7j-VH9qqTih6g_BAK5GCH9';
const CLOUD_BUCKET='owner-manual-files';
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
function cloudEsc(s){
  return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function cloudInitFileState(){
  if(!state.areaFiles||typeof state.areaFiles!=='object'||Array.isArray(state.areaFiles))state.areaFiles={};
  (state.components||[]).forEach(c=>{if(!Array.isArray(c.files))c.files=[]});
}
function cloudComponent(id){return (state.components||[]).find(c=>c.id===id)}
function cloudAreaFiles(area){cloudInitFileState();return state.areaFiles[area]||(state.areaFiles[area]=[])}
function cloudComponentFiles(id){cloudInitFileState();const c=cloudComponent(id);if(!c)return null;if(!Array.isArray(c.files))c.files=[];return c.files}
function cloudSafeName(s){return String(s||'file').replace(/[^a-zA-Z0-9._-]+/g,'_').replace(/^_+|_+$/g,'').slice(-120)||'file'}
function cloudSlug(s){return String(s||'item').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'item'}
function cloudId(){return (crypto?.randomUUID?.()||('f'+Date.now()+'_'+Math.random().toString(36).slice(2)))}
function cloudFormatBytes(n){
  const v=Number(n)||0;if(v<1024)return v+' B';if(v<1048576)return (v/1024).toFixed(v<10240?1:0)+' KB';if(v<1073741824)return (v/1048576).toFixed(v<10485760?1:0)+' MB';return (v/1073741824).toFixed(1)+' GB';
}
function cloudIsImage(f){return String(f?.mime||'').startsWith('image/')||/\.(jpe?g|png|gif|webp|heic|heif|bmp|avif)$/i.test(f?.name||'')}
function cloudIsMobile(){return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)||matchMedia('(pointer:coarse)').matches}

async function cloudEnsureSession(){
  if(cloudSession)return cloudSession;
  if(!cloudClient)cloudClient=window.supabase.createClient(CLOUD_SB_URL,CLOUD_SB_KEY);
  const {data}=await cloudClient.auth.getSession();
  cloudSession=data.session;
  return cloudSession;
}
async function cloudFreshRead(sess){
  const q='select=state,updated_at&user_id=eq.'+encodeURIComponent(sess.user.id)+'&limit=1';
  const r=await fetch(CLOUD_SB_URL+'/rest/v1/owner_manuals?'+q,{cache:'no-store',headers:{apikey:CLOUD_SB_KEY,Authorization:'Bearer '+sess.access_token,Accept:'application/json','Cache-Control':'no-cache','Pragma':'no-cache'}});
  if(!r.ok)throw new Error('Cloud read failed: '+r.status);
  const rows=await r.json();
  return rows[0]||null;
}
function cloudMarkConfirmed(row){
  if(!row?.state)return;
  window.__ABSTRACTION_CLOUD_UPDATED_AT=row.updated_at||window.__ABSTRACTION_CLOUD_UPDATED_AT||'';
  const sync=window.__ABSTRACTION_SYNC;
  if(sync){
    sync.baselineRaw=JSON.parse(JSON.stringify(row.state));
    sync.baselineCanon=cloudCanon(row.state);
    sync.lastUpdatedAt=row.updated_at||sync.lastUpdatedAt||'';
  }
}
async function cloudBackgroundVerify(sess,outgoing){
  for(const delay of [700,1400]){
    await new Promise(r=>setTimeout(r,delay));
    try{
      const fresh=await cloudFreshRead(sess);
      if(fresh?.state&&cloudCanon(fresh.state)===cloudCanon(outgoing)){
        cloudMarkConfirmed(fresh);
        return true;
      }
    }catch(e){console.warn('background cloud verification',e)}
  }
  console.warn('Background cloud verification did not match the already-confirmed save.');
  return false;
}
async function cloudSave(){
  if(cloudSaving)return false;
  const sess=await cloudEnsureSession();
  if(!sess){cloudToast('Sign in again to save to cloud.',2200);return false}
  cloudSaving=true;
  try{
    cloudInitFileState();
    if(typeof save==='function')save();
    state.__cloudSavedAt=new Date().toISOString();
    save();
    const outgoing=JSON.parse(JSON.stringify(state));
    const {data,error}=await cloudClient.from('owner_manuals').upsert({user_id:sess.user.id,state:outgoing},{onConflict:'user_id'}).select('state,updated_at').single();
    if(error||!data||cloudCanon(data.state)!==cloudCanon(outgoing)){
      cloudToast('Cloud save failed. Changes were not confirmed.',2600);return false;
    }
    state=data.state;
    cloudInitFileState();
    save();
    cloudMarkConfirmed(data);
    cloudToast('✓ Saved to cloud',1400);
    cloudBackgroundVerify(sess,outgoing);
    return true;
  }catch(e){
    console.warn('cloud save',e);
    cloudToast('Cloud save failed.',2600);
    return false;
  }finally{cloudSaving=false}
}
async function cloudReloadFromServer(){
  const sess=await cloudEnsureSession();if(!sess)return false;
  try{
    const data=await cloudFreshRead(sess);
    if(!data?.state)return false;
    state=data.state;cloudInitFileState();save();renderAll();
    if(!ce('area').classList.contains('hidden')&&typeof renderArea==='function')renderArea();
    cloudMarkConfirmed(data);
    cloudTopActive();
    return true;
  }catch(e){console.warn('cloud reload',e);return false}
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

function cloudPicker(scope,scopeId,camera=false){
  const input=document.createElement('input');
  input.type='file';
  input.style.display='none';
  if(camera){input.accept='image/*';input.setAttribute('capture','environment')}
  else{input.multiple=true;input.accept='image/*,application/pdf,.dxf,.dwg,.step,.stp,.iges,.igs,.sldprt,.sldasm,.slddrw,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip'}
  document.body.appendChild(input);
  input.onchange=async()=>{const files=[...(input.files||[])];input.remove();if(files.length)await cloudUploadFiles(files,scope,scopeId)};
  input.oncancel=()=>input.remove();
  input.click();
}
function cloudFileList(scope,scopeId){
  if(scope==='area')return cloudAreaFiles(scopeId);
  return cloudComponentFiles(scopeId);
}
async function cloudUploadFiles(files,scope,scopeId){
  const sess=await cloudEnsureSession();if(!sess){cloudToast('Sign in again to upload files.',2200);return}
  const list=cloudFileList(scope,scopeId);if(!list)return;
  cloudToast(files.length===1?'Uploading file…':`Uploading ${files.length} files…`,5000);
  let added=0;
  for(const file of files){
    if(file.size>104857600){cloudToast(`${file.name} is over the 100 MB file limit.`,3200);continue}
    const id=cloudId();
    const folder=scope==='area'?`areas/${cloudSlug(scopeId)}`:`components/${cloudSlug(scopeId)}`;
    const path=`${sess.user.id}/${folder}/${Date.now()}-${id.slice(0,8)}-${cloudSafeName(file.name)}`;
    const {error}=await cloudClient.storage.from(CLOUD_BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||'application/octet-stream'});
    if(error){console.warn('upload',error);cloudToast(`Could not upload ${file.name}.`,2800);continue}
    list.push({id,name:file.name,path,mime:file.type||'',size:file.size||0,createdAt:new Date().toISOString()});
    added++;
  }
  if(added){save();await cloudSave();cloudToast(added===1?'File added.':`${added} files added.`);cloudRefreshFileViews()}
}
async function cloudDeleteFile(scope,scopeId,fileId){
  const list=cloudFileList(scope,scopeId);if(!list)return;
  const item=list.find(x=>x.id===fileId);if(!item)return;
  if(!confirm(`Delete "${item.name}"?`))return;
  const {error}=await cloudClient.storage.from(CLOUD_BUCKET).remove([item.path]);
  if(error){cloudToast('Could not delete the stored file.',2600);return}
  const i=list.findIndex(x=>x.id===fileId);if(i>=0)list.splice(i,1);
  save();await cloudSave();cloudRefreshFileViews();
}
async function cloudSigned(path,expires=3600){
  const {data,error}=await cloudClient.storage.from(CLOUD_BUCKET).createSignedUrl(path,expires);
  if(error)return null;return data?.signedUrl||null;
}
function cloudAttachToolbar(scope,scopeId){
  const div=document.createElement('div');div.className='cloudAttachToolbar';
  const add=document.createElement('button');add.type='button';add.className='btn primary';add.textContent='Add Photo / File';add.onclick=()=>cloudPicker(scope,scopeId,false);div.appendChild(add);
  if(cloudIsMobile()){
    const cam=document.createElement('button');cam.type='button';cam.className='btn';cam.textContent='Take Photo';cam.onclick=()=>cloudPicker(scope,scopeId,true);div.appendChild(cam);
  }
  return div;
}
async function cloudRenderFileCards(container,scope,scopeId){
  if(!container)return;
  const list=cloudFileList(scope,scopeId)||[];
  container.innerHTML='';
  container.appendChild(cloudAttachToolbar(scope,scopeId));
  const grid=document.createElement('div');grid.className='cloudFileGrid';container.appendChild(grid);
  if(!list.length){const empty=document.createElement('div');empty.className='cloudFileEmpty';empty.textContent='No photos or files attached here yet.';grid.appendChild(empty);return}
  for(const item of list.slice().sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')))){
    const card=document.createElement('div');card.className='cloudFileCard';
    const preview=document.createElement('div');preview.className='cloudFilePreview';
    if(cloudIsImage(item)){
      const img=document.createElement('img');img.alt=item.name;preview.appendChild(img);
      cloudSigned(item.path).then(url=>{if(url){img.src=url;img.onclick=()=>window.open(url,'_blank')}});
    }else{
      const icon=document.createElement('div');icon.className='cloudFileIcon';icon.textContent=(item.name.split('.').pop()||'FILE').slice(0,5).toUpperCase();preview.appendChild(icon);
    }
    const info=document.createElement('div');info.className='cloudFileInfo';
    const name=document.createElement('div');name.className='cloudFileName';name.textContent=item.name;
    const meta=document.createElement('div');meta.className='cloudFileMeta';meta.textContent=[cloudFormatBytes(item.size),item.createdAt?new Date(item.createdAt).toLocaleDateString():''].filter(Boolean).join(' • ');
    const actions=document.createElement('div');actions.className='cloudFileActions';
    const open=document.createElement('a');open.className='btn cloudFileOpen';open.textContent='Open';open.target='_blank';open.rel='noopener';open.href='#';
    cloudSigned(item.path,600).then(url=>{if(url)open.href=url;else open.classList.add('disabled')});
    const del=document.createElement('button');del.type='button';del.className='btn';del.textContent='Delete';del.onclick=()=>cloudDeleteFile(scope,scopeId,item.id);
    actions.append(open,del);info.append(name,meta,actions);card.append(preview,info);grid.appendChild(card);
  }
}
function cloudRefreshFileViews(){
  if(ce('cloudAreaFilesPane')&&!ce('cloudAreaFilesPane').classList.contains('hidden'))cloudRenderAreaFiles();
  if(ce('detailDlg')?.open)cloudRenderComponentDetailFiles();
  if(ce('editDlg')?.open)cloudRenderComponentEditFiles();
}
function cloudRenderAreaFiles(){
  const pane=ce('cloudAreaFilesPane');if(!pane)return;
  cloudRenderFileCards(pane,'area',currentArea);
}
function cloudRenderComponentDetailFiles(){
  const host=ce('cloudComponentFiles');if(!host)return;
  const id=detailId||'';
  if(!id){host.innerHTML='<div class="cloudFileEmpty">No component selected.</div>';return}
  cloudRenderFileCards(host,'component',id);
}
function cloudRenderComponentEditFiles(){
  const host=ce('cloudEditComponentFiles');if(!host)return;
  const id=ce('id')?.value||'';
  if(!id||!cloudComponent(id)){
    host.innerHTML='<div class="cloudFileEmpty">Save this component first, then reopen it to attach photos or files.</div>';
    return;
  }
  cloudRenderFileCards(host,'component',id);
}
function cloudEnsureAreaFilesUI(){
  const tabs=document.querySelector('#area .tabs');const content=document.querySelector('#area .content');if(!tabs||!content)return;
  if(!ce('cloudAreaFilesTab')){
    const b=document.createElement('button');b.type='button';b.id='cloudAreaFilesTab';b.className='tab';b.dataset.tab='files';b.textContent='Photos/Files';tabs.appendChild(b);
    b.onclick=()=>setTab('files');
  }
  if(!ce('cloudAreaFilesPane')){
    const p=document.createElement('div');p.id='cloudAreaFilesPane';p.className='hidden';content.appendChild(p);
  }
  if(!window.__cloudSetTabWrapped){
    window.__cloudSetTabWrapped=true;
    const originalSetTab=setTab;
    setTab=function(t){
      const r=originalSetTab(t);
      ce('cloudAreaFilesPane')?.classList.toggle('hidden',t!=='files');
      if(t==='files')cloudRenderAreaFiles();
      return r;
    };
  }
}
function cloudEnsureComponentFilesUI(){
  const detail=document.querySelector('#detailDlg .detail');
  if(detail&&!ce('cloudComponentFilesBox')){
    const box=document.createElement('div');box.id='cloudComponentFilesBox';box.className='box full cloudAttachmentBox';
    box.innerHTML='<h4>Photos / Files</h4><div id="cloudComponentFiles"></div>';detail.appendChild(box);
  }
  const editBody=document.querySelector('#editDlg .mb');
  if(editBody&&!ce('cloudEditFilesBox')){
    const box=document.createElement('div');box.id='cloudEditFilesBox';box.className='cloudEditFilesBox';
    box.innerHTML='<div class="cloudEditFilesTitle">Photos / Files</div><div id="cloudEditComponentFiles"></div>';editBody.appendChild(box);
  }
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
  cloudInitFileState();

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
    top.innerHTML='<img class="cloudTopLogo" src="abstraction-logo-white.svg?v=20260930-0835-v2" alt="Abstraction"><div class="cloudTopNav" id="cloudTopNav"><button type="button" data-page="visual">Main Menu</button><button type="button" data-page="systems">Systems</button><button type="button" data-page="index">Component Index</button></div><button type="button" class="cloudTopAdd" id="cloudTopAdd">+ Add Component</button>';
    document.body.prepend(top);
    document.querySelectorAll('#cloudTopNav button').forEach(b=>b.onclick=async()=>{
      const p=b.dataset.page;
      if(p==='visual'){
        const saving=cloudSave();
        cloudGoHome();
        await saving;
      }else{show(p);cloudTopActive()}
    });
    ce('cloudTopAdd').onclick=()=>edit(null);
  }

  const head=document.querySelector('#home .panelHead > div');
  if(head){head.classList.add('cloudMainHead');const bold=head.querySelector('b');if(bold)bold.textContent='MAIN MENU'}

  if(ce('back'))ce('back').textContent='← Main Menu';

  cloudConvertSelect('system',CLOUD_SYSTEMS);
  cloudConvertSelect('type',CLOUD_TYPES);
  cloudEnsureAreaFilesUI();
  cloudEnsureComponentFilesUI();

  if(!window.__cloudEditWrapped){
    window.__cloudEditWrapped=true;
    const originalEdit=edit;
    edit=function(c){
      const s=cloudConvertSelect('system',CLOUD_SYSTEMS),t=cloudConvertSelect('type',CLOUD_TYPES);
      cloudEnsureOption(s,c?.system||'');cloudEnsureOption(t,c?.type||'');
      originalEdit(c);
      setTimeout(cloudRenderComponentEditFiles,0);
    };
  }
  if(!window.__cloudOpenDetailWrapped){
    window.__cloudOpenDetailWrapped=true;
    const originalOpenDetail=openDetail;
    openDetail=function(id){const r=originalOpenDetail(id);setTimeout(cloudRenderComponentDetailFiles,0);return r};
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
    ce('deleteBtn')?.addEventListener('click',()=>{
      const id=ce('id')?.value||'';
      const files=(cloudComponentFiles(id)||[]).map(x=>x.path);
      setTimeout(async()=>{
        if(id&&!cloudComponent(id)&&files.length){try{await cloudClient.storage.from(CLOUD_BUCKET).remove(files)}catch(e){console.warn(e)}}
        await cloudSave();
      },160);
    });
  }

  cloudTopActive();
}
window.addEventListener('pageshow',async e=>{if(e.persisted){await cloudReloadFromServer();await cloudBuildUI()}});
cloudBuildUI();
})();