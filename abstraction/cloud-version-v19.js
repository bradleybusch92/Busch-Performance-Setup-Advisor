(() => {
'use strict';
const VERSION='v2026.09.30.19';
function setVersion(){
  const el=document.getElementById('cloudVersion');
  if(el)el.textContent=VERSION;
}
setVersion();
setTimeout(setVersion,700);
setTimeout(setVersion,2500);
setTimeout(setVersion,5500);
setTimeout(setVersion,9000);
})();
