(() => {
'use strict';
const ENGINE_VERSION='v2026.09.30.4';
let installed=false;

function setVersion(){
  const v=document.getElementById('cloudVersion');
  if(v)v.textContent=ENGINE_VERSION;
}

function ensureEngineState(){
  try{
    if(typeof areas!=='undefined'&&!areas.includes('Engine')){
      const cockpitIndex=areas.indexOf('Cockpit');
      if(cockpitIndex>=0)areas.splice(cockpitIndex,0,'Engine');
      else areas.push('Engine');
    }
    if(typeof desc!=='undefined')desc.Engine='Engine assembly and engine-specific components, accessories, plumbing, ignition and related hardware.';
    if(typeof state!=='undefined'){
      state.schemas=state.schemas||{};
      if(!Array.isArray(state.schemas.Engine))state.schemas.Engine=[];
      (state.profiles||[]).forEach(p=>{
        p.sections=p.sections||{};
        if(!p.sections.Engine)p.sections.Engine={values:{},notes:''};
      });
      if(!state.areaFiles||typeof state.areaFiles!=='object'||Array.isArray(state.areaFiles))state.areaFiles={};
      if(!Array.isArray(state.areaFiles.Engine))state.areaFiles.Engine=[];
      if(typeof save==='function')save();
    }
  }catch(e){console.warn('engine state',e)}
}

function ensureEngineLocationOption(){
  const sel=document.getElementById('location');
  if(!sel)return;
  if(![...sel.options].some(o=>o.value==='Engine')){
    const opt=new Option('Engine','Engine');
    const cockpit=[...sel.options].find(o=>o.value==='Cockpit');
    if(cockpit)sel.insertBefore(opt,cockpit);
    else sel.add(opt);
  }
}

function ensureEngineStyle(){
  if(document.getElementById('cloudEngineStyle'))return;
  const style=document.createElement('style');
  style.id='cloudEngineStyle';
  style.textContent=`.car .zone.engine{left:50%;transform:translateX(-50%);top:24%;width:27%;height:9%;z-index:4}`;
  document.head.appendChild(style);
}

function ensureEngineZone(){
  const car=document.querySelector('#home .car');
  if(!car)return false;
  let btn=car.querySelector('.zone[data-area="Engine"]');
  if(!btn){
    btn=document.createElement('button');
    btn.type='button';
    btn.className='zone engine';
    btn.dataset.area='Engine';
    btn.textContent='Engine';
    const cockpit=car.querySelector('.zone[data-area="Cockpit"]');
    if(cockpit)car.insertBefore(btn,cockpit);
    else car.appendChild(btn);
  }
  if(!btn.__engineBound){
    btn.__engineBound=true;
    btn.onclick=()=>{
      if(typeof openArea==='function')openArea('Engine');
      setTimeout(()=>{
        if(typeof cloudTopActive==='function')cloudTopActive();
      },0);
    };
  }
  return true;
}

function install(){
  if(installed)return true;
  ensureEngineState();
  ensureEngineLocationOption();
  ensureEngineStyle();
  if(!ensureEngineZone())return false;

  const form=document.getElementById('editForm');
  if(form&&!form.__engineOptionBound){
    form.__engineOptionBound=true;
    form.addEventListener('click',ensureEngineLocationOption,true);
  }

  if(typeof renderAll==='function')renderAll();
  setVersion();
  setTimeout(setVersion,350);
  setTimeout(setVersion,1000);
  installed=true;
  return true;
}

if(!install()){
  const obs=new MutationObserver(()=>{
    ensureEngineState();
    ensureEngineLocationOption();
    ensureEngineStyle();
    if(install())obs.disconnect();
  });
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>{if(install())obs.disconnect()},1500);
}
})();
