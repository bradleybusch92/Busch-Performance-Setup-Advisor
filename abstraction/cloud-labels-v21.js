(() => {
'use strict';
const VERSION='v2026.10.01.21';

function applyLabels(){
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
document.addEventListener('click',()=>setTimeout(applyLabels,0),true);
document.addEventListener('change',()=>setTimeout(applyLabels,0),true);
})();
