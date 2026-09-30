(() => {
'use strict';
const ADVISOR_VERSION='v2026.09.30.3';
const ADVISOR_SRC='../index.html?embedded=abstraction&v=20260930-0845-v3';
let installed=false;

function exitAdvisor(){
  document.body.classList.remove('cloudAdvisorMode');
  const frame=document.getElementById('cloudSetupAdvisorFrame');
  if(frame)frame.setAttribute('aria-hidden','true');
}

function showAdvisor(){
  document.querySelectorAll('dialog[open]').forEach(d=>{try{d.close()}catch(e){}});
  let frame=document.getElementById('cloudSetupAdvisorFrame');
  if(!frame){
    frame=document.createElement('iframe');
    frame.id='cloudSetupAdvisorFrame';
    frame.className='cloudSetupAdvisorFrame';
    frame.title='Busch Performance Setup Advisor';
    frame.src=ADVISOR_SRC;
    frame.setAttribute('aria-hidden','false');
    document.body.appendChild(frame);
  }else{
    frame.setAttribute('aria-hidden','false');
  }
  document.body.classList.add('cloudAdvisorMode');
  document.querySelectorAll('#cloudTopNav button').forEach(b=>b.classList.remove('active'));
}

function setVersion(){
  const version=document.getElementById('cloudVersion');
  if(version)version.textContent=ADVISOR_VERSION;
}

function install(){
  if(installed)return true;
  const nav=document.getElementById('cloudTopNav');
  if(!nav)return false;

  let btn=document.getElementById('cloudSetupAdvisorTab');
  if(!btn){
    btn=document.createElement('button');
    btn.type='button';
    btn.id='cloudSetupAdvisorTab';
    btn.dataset.page='advisor';
    btn.textContent='Setup Advisor';
    nav.appendChild(btn);
  }
  btn.addEventListener('click',e=>{
    e.preventDefault();
    e.stopPropagation();
    showAdvisor();
  });

  nav.querySelectorAll('button:not(#cloudSetupAdvisorTab)').forEach(b=>{
    b.addEventListener('click',()=>exitAdvisor(),true);
  });
  document.getElementById('cloudTopAdd')?.addEventListener('click',()=>exitAdvisor(),true);

  setVersion();
  setTimeout(setVersion,0);
  setTimeout(setVersion,250);

  installed=true;
  return true;
}

if(!install()){
  const obs=new MutationObserver(()=>{
    if(install())obs.disconnect();
  });
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>{if(install())obs.disconnect()},1000);
}
})();
