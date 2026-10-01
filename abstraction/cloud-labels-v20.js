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
  if(version&&version.textContent!==VERSION)version.textContent=VERSION;
}

applyLabels();
[300,800,1500,3000,6000,10000].forEach(ms=>setTimeout(applyLabels,ms));

/* Re-apply after user interaction so dynamically rendered area titles stay display-only "General". */
document.addEventListener('click',()=>setTimeout(applyLabels,0),true);
document.addEventListener('change',()=>setTimeout(applyLabels,0),true);
})();
