(() => {
'use strict';
const SYNC_VERSION='v2026.09.30.13';
let baselineRaw=null;
try{
  baselineRaw=JSON.parse(JSON.stringify(window.__ABSTRACTION_CLOUD_BOOT||state||null));
}catch(e){baselineRaw=null}
window.__ABSTRACTION_SYNC={
  version:SYNC_VERSION,
  baselineRaw,
  lastUpdatedAt:window.__ABSTRACTION_CLOUD_UPDATED_AT||'',
  checking:false,
  lastCheckAt:0
};

/* cloud-enhance.js historically installed a BFCache pageshow handler that
   immediately replaced the page state. Intercept only that next pageshow
   registration, then restore the native method before later UI scripts run. */
const nativeAdd=window.addEventListener;
let intercepted=false;
window.addEventListener=function(type,listener,options){
  if(!intercepted&&type==='pageshow'){
    intercepted=true;
    window.addEventListener=nativeAdd;
    return;
  }
  return nativeAdd.call(this,type,listener,options);
};
setTimeout(()=>{
  if(window.addEventListener!==nativeAdd)window.addEventListener=nativeAdd;
},2500);
})();
