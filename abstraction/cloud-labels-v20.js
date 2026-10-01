(() => {
'use strict';
const VERSION='v2026.09.30.20';

function applyLabels(){
  /* Display-only rename. The real stored area key remains "General Setup". */
  document.querySelectorAll('[data-area="General Setup"]').forEach(el=>{
    if(el.textContent.trim()!=='General')el.textContent='General';
  });

  const areaTitle=document.getElementById('areaTitle');
  if(areaTitle&&areaTitle.textContent.trim()==='General Setup')areaTitle.textContent='General';

  document.querySelectorAll('option').forEach(opt=>{
    if(opt.value==='General Setup'&&opt.textContent.trim()==='General Setup')opt.textContent='General';
  });

  const version=document.getElementById('cloudVersion');
  if(version)version.textContent=VERSION;
}

applyLabels();
const observer=new MutationObserver(applyLabels);
observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
[500,1200,2500,5000,9000,14000].forEach(ms=>setTimeout(applyLabels,ms));
})();
