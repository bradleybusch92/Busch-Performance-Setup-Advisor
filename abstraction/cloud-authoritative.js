(() => {
'use strict';
const AUTHORITATIVE_VERSION='v2026.09.30.16';

function clone(v){return JSON.parse(JSON.stringify(v))}
function setVersion(){
  const el=document.getElementById('cloudVersion');
  if(el)el.textContent=AUTHORITATIVE_VERSION;
}

try{
  const boot=window.__ABSTRACTION_CLOUD_BOOT;
  if(!boot||!Array.isArray(boot.components)){
    console.warn('authoritative cloud boot state missing');
  }else{
    /* The cloud snapshot that cloud.html just fetched is authoritative. Replace
       whatever the inner app initialized from, including stale Safari localStorage. */
    state=clone(boot);
    if(!state.areaFiles||typeof state.areaFiles!=='object'||Array.isArray(state.areaFiles))state.areaFiles={};
    (state.components||[]).forEach(c=>{if(!Array.isArray(c.files))c.files=[]});
    if(typeof save==='function')save();
    if(typeof renderAll==='function')renderAll();
    const area=document.getElementById('area');
    if(area&&!area.classList.contains('hidden')&&typeof renderArea==='function')renderArea();
    window.__ABSTRACTION_RUNTIME_BOOT_COUNT=state.components.length;
    window.__ABSTRACTION_RUNTIME_FORCED_FROM_CLOUD=true;
  }
}catch(e){
  console.warn('authoritative cloud state reset',e);
}

setVersion();
setTimeout(setVersion,700);
setTimeout(setVersion,2500);
setTimeout(setVersion,5500);
setTimeout(setVersion,9000);
})();
