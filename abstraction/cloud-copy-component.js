(() => {
'use strict';
const COPY_VERSION='v2026.09.30.12';
const COPY_AREAS=['Front End','Engine','LF','RF','Cockpit','General Setup','LR','RR','Rear End'];
let installed=false;

function setVersion(){
  const v=document.getElementById('cloudVersion');
  if(v&&v.textContent!==COPY_VERSION)v.textContent=COPY_VERSION;
}
function newComponentId(){
  if(window.crypto?.randomUUID)return 'e'+window.crypto.randomUUID();
  return 'e'+Date.now()+'_'+Math.random().toString(36).slice(2,9);
}
function currentComponent(){
  try{return state?.components?.find(c=>c.id===detailId)||null}catch(e){return null}
}
function rebuildSelect(){
  const sel=document.getElementById('cloudCopyComponentSelect');
  if(!sel)return;
  const c=currentComponent();
  sel.innerHTML='<option value="">Choose area…</option>'+COPY_AREAS.map(area=>
    `<option value="${area.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}">${area}${c?.location===area?' (current)':''}</option>`
  ).join('');
  sel.value='';
}
function collapse(){
  const sel=document.getElementById('cloudCopyComponentSelect');
  const btn=document.getElementById('cloudCopyComponentBtn');
  if(sel){sel.classList.add('hidden');sel.value=''}
  if(btn)btn.setAttribute('aria-expanded','false');
}
async function copyTo(target){
  const source=currentComponent();
  if(!source||!target)return;
  if(!confirm(`Copy "${source.title}" to ${target}?`)){
    const sel=document.getElementById('cloudCopyComponentSelect');
    if(sel)sel.value='';
    return;
  }
  const copy=JSON.parse(JSON.stringify(source));
  copy.id=newComponentId();
  copy.location=target;
  // Stored attachments are intentionally not shared between component records.
  // This prevents deleting a file from one component from breaking another copy.
  copy.files=[];
  state.components.push(copy);
  if(typeof save==='function')save();
  if(typeof renderAll==='function')renderAll();
  const area=document.getElementById('area');
  if(area&&!area.classList.contains('hidden')&&typeof renderArea==='function')renderArea();
  collapse();
  if(typeof toast==='function')toast(`Copied ${source.title} to ${target}`);
  const cloudSaveBtn=document.getElementById('cloudBottomSave');
  if(cloudSaveBtn&&!cloudSaveBtn.disabled)setTimeout(()=>cloudSaveBtn.click(),0);
}
function install(){
  if(installed)return true;
  const dlg=document.getElementById('detailDlg');
  const footer=dlg?.querySelector('.mf');
  const editBtn=document.getElementById('editBtn');
  if(!dlg||!footer||!editBtn)return false;
  if(!document.getElementById('cloudCopyComponentWrap')){
    const wrap=document.createElement('div');
    wrap.id='cloudCopyComponentWrap';
    wrap.className='cloudCopyComponentWrap';
    const btn=document.createElement('button');
    btn.type='button';
    btn.id='cloudCopyComponentBtn';
    btn.className='btn';
    btn.textContent='Copy Component To:';
    btn.setAttribute('aria-expanded','false');
    const sel=document.createElement('select');
    sel.id='cloudCopyComponentSelect';
    sel.className='cloudCopyComponentSelect hidden';
    sel.setAttribute('aria-label','Copy component to area');
    btn.onclick=()=>{
      const opening=sel.classList.contains('hidden');
      if(opening){rebuildSelect();sel.classList.remove('hidden');btn.setAttribute('aria-expanded','true');sel.focus()}
      else collapse();
    };
    sel.onchange=()=>{if(sel.value)copyTo(sel.value)};
    wrap.append(btn,sel);
    editBtn.insertAdjacentElement('afterend',wrap);
  }
  if(!window.__cloudCopyOpenDetailWrapped&&typeof openDetail==='function'){
    window.__cloudCopyOpenDetailWrapped=true;
    const originalOpenDetail=openDetail;
    openDetail=function(id){
      const r=originalOpenDetail(id);
      collapse();
      return r;
    };
  }
  dlg.addEventListener('close',collapse);
  setVersion();
  setTimeout(setVersion,500);
  setTimeout(setVersion,1800);
  setTimeout(setVersion,4000);
  setTimeout(setVersion,6500);
  installed=true;
  return true;
}
if(!install()){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(install()||tries>=30)clearInterval(timer);
  },150);
}
})();
