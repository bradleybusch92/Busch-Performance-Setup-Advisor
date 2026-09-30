(() => {
'use strict';
const LOGIN_VERSION='v2026.09.30.7';
function apply(){
  const help=document.querySelector('#cloudAccountDlg .cloudAccountHelp');
  if(help)help.textContent='You can sign in with either this username or your email address, using the same password.';
  const v=document.getElementById('cloudVersion');
  if(v)v.textContent=LOGIN_VERSION;
}
apply();
const obs=new MutationObserver(apply);
obs.observe(document.documentElement,{childList:true,subtree:true});
setTimeout(apply,300);
setTimeout(apply,1200);
setTimeout(()=>{apply();obs.disconnect()},3000);
})();
