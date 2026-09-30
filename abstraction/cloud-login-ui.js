(() => {
'use strict';
const LOGIN_VERSION='v2026.09.30.8';
const HELP_TEXT='You can sign in with either this username or your email address, using the same password.';
function apply(){
  const help=document.querySelector('#cloudAccountDlg .cloudAccountHelp');
  if(help&&help.textContent!==HELP_TEXT)help.textContent=HELP_TEXT;
  const v=document.getElementById('cloudVersion');
  if(v&&v.textContent!==LOGIN_VERSION)v.textContent=LOGIN_VERSION;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});
else apply();
setTimeout(apply,300);
setTimeout(apply,1200);
setTimeout(apply,2600);
setTimeout(apply,3800);
})();
