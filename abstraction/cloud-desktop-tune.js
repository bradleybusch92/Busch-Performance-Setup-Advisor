(() => {
'use strict';
const VERSION='v2026.09.30.11';
function setVersion(){
  const v=document.getElementById('cloudVersion');
  if(v&&v.textContent!==VERSION)v.textContent=VERSION;
}
setVersion();
setTimeout(setVersion,350);
setTimeout(setVersion,1400);
setTimeout(setVersion,3200);
setTimeout(setVersion,5000);
})();
