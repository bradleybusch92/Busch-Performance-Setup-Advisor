(() => {
'use strict';
const DESKTOP_VERSION='v2026.09.30.9';
const DESKTOP_QUERY='(min-width:1051px)';
const mq=window.matchMedia(DESKTOP_QUERY);
const AREA_ORDER=['Front End','Engine','LF','RF','Cockpit','General Setup','LR','RR','Rear End'];
let active=false;
let profileAnchor=null;
let bottomAnchor=null;
let retryTimer=null;

function byId(id){return document.getElementById(id)}

function setVersion(){
  const v=byId('cloudVersion');
  if(v)v.textContent=DESKTOP_VERSION;
}

function ensureAnchor(node,label){
  if(!node?.parentNode)return null;
  const a=document.createComment(label);
  node.parentNode.insertBefore(a,node);
  return a;
}

function restoreNode(node,anchor){
  if(!node||!anchor?.parentNode)return;
  anchor.parentNode.insertBefore(node,anchor);
  anchor.remove();
}

function ensureAreaNav(){
  const top=byId('cloudTopbar');
  if(!top)return null;
  let wrap=byId('cloudDesktopAreas');
  if(wrap)return wrap;
  wrap=document.createElement('div');
  wrap.id='cloudDesktopAreas';
  wrap.className='cloudDesktopAreas';
  wrap.innerHTML='<div class="cloudDesktopSectionTitle">Car Areas</div><div class="cloudDesktopAreaGrid"></div>';
  const grid=wrap.querySelector('.cloudDesktopAreaGrid');
  AREA_ORDER.forEach(area=>{
    const b=document.createElement('button');
    b.type='button';
    b.className='cloudDesktopAreaBtn'+((area==='Front End'||area==='General Setup'||area==='Rear End')?' wide':'');
    b.dataset.area=area;
    b.textContent=area;
    b.addEventListener('click',()=>{
      document.body.classList.remove('cloudAdvisorMode');
      const frame=byId('cloudSetupAdvisorFrame');
      if(frame)frame.setAttribute('aria-hidden','true');
      try{if(typeof show==='function')show('visual')}catch(e){}
      try{if(typeof openArea==='function')openArea(area)}catch(e){console.warn('desktop area nav',e)}
      window.scrollTo(0,0);
      setTimeout(updateActiveArea,0);
    });
    grid.appendChild(b);
  });
  const add=byId('cloudTopAdd');
  if(add?.parentNode)add.insertAdjacentElement('afterend',wrap);
  else top.appendChild(wrap);
  return wrap;
}

function moveDesktopControls(){
  const top=byId('cloudTopbar');
  const profiles=document.querySelector('.profiles');
  if(top&&profiles&&profiles.parentNode!==top){
    if(!profileAnchor)profileAnchor=ensureAnchor(profiles,'desktop-profile-anchor');
    top.appendChild(profiles);
  }
  const bottom=byId('cloudBottom');
  if(top&&bottom&&bottom.parentNode!==top){
    if(!bottomAnchor)bottomAnchor=ensureAnchor(bottom,'desktop-bottom-anchor');
    top.appendChild(bottom);
  }
}

function restoreMobileControls(){
  const profiles=document.querySelector('.profiles');
  const bottom=byId('cloudBottom');
  if(profileAnchor){restoreNode(profiles,profileAnchor);profileAnchor=null}
  if(bottomAnchor){restoreNode(bottom,bottomAnchor);bottomAnchor=null}
}

function updateActiveArea(){
  const area=typeof currentArea!=='undefined'?currentArea:'';
  const areaOpen=!!byId('area')&&!byId('area').classList.contains('hidden')&&!byId('visual')?.classList.contains('hidden');
  document.querySelectorAll('.cloudDesktopAreaBtn').forEach(b=>{
    b.classList.toggle('active',areaOpen&&b.dataset.area===area);
  });
}

function bindActivityUpdates(){
  if(document.body.dataset.desktopActivityBound==='1')return;
  document.body.dataset.desktopActivityBound='1';
  document.addEventListener('click',e=>{
    if(e.target.closest('.zone,#back,#cloudTopNav button,.cloudDesktopAreaBtn'))setTimeout(updateActiveArea,0);
  },true);
}

function syncDesktop(){
  if(!mq.matches)return false;
  const top=byId('cloudTopbar');
  const shell=document.querySelector('.shell');
  if(!top||!shell)return false;
  document.body.classList.add('cloudDesktopMode');
  ensureAreaNav();
  moveDesktopControls();
  bindActivityUpdates();
  updateActiveArea();
  setVersion();
  active=true;
  return true;
}

function activate(){
  if(!mq.matches)return;
  if(syncDesktop()){
    setTimeout(syncDesktop,250);
    setTimeout(syncDesktop,900);
    setTimeout(setVersion,1500);
    setTimeout(setVersion,3000);
    setTimeout(setVersion,4600);
    return;
  }
  let tries=0;
  clearInterval(retryTimer);
  retryTimer=setInterval(()=>{
    tries++;
    if(syncDesktop()||tries>=30){clearInterval(retryTimer);retryTimer=null}
  },150);
}

function deactivate(){
  clearInterval(retryTimer);retryTimer=null;
  if(!active&&!document.body.classList.contains('cloudDesktopMode'))return;
  document.body.classList.remove('cloudDesktopMode');
  restoreMobileControls();
  active=false;
}

function applyMode(){
  if(mq.matches)activate();
  else deactivate();
}

if(typeof mq.addEventListener==='function')mq.addEventListener('change',applyMode);
else if(typeof mq.addListener==='function')mq.addListener(applyMode);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyMode,{once:true});
else applyMode();
window.addEventListener('pageshow',()=>setTimeout(applyMode,0));
})();
