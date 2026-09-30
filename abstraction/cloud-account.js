(() => {
'use strict';
const ACCOUNT_VERSION='v2026.09.30.6';
const ACCOUNT_SB_URL='https://gjlhegrcmaclikeoeonh.supabase.co';
const ACCOUNT_SB_KEY='sb_publishable_bh-dXv2tB7j-VH9qqTih6g_BAK5GCH9';
let accountInstalled=false;
let accountUsername='';
let accountCurrentSession=null;
let accountClient=null;

function accountSetVersion(){
  const v=document.getElementById('cloudVersion');
  if(v)v.textContent=ACCOUNT_VERSION;
}

function accountGetClient(){
  if(!accountClient){
    if(!window.supabase?.createClient)throw new Error('Supabase client is not available.');
    accountClient=window.supabase.createClient(ACCOUNT_SB_URL,ACCOUNT_SB_KEY);
  }
  return accountClient;
}

async function accountSession(force=false){
  if(accountCurrentSession&&!force)return accountCurrentSession;
  try{
    const client=accountGetClient();
    const {data,error}=await client.auth.getSession();
    if(error)throw error;
    accountCurrentSession=data?.session||null;
    return accountCurrentSession;
  }catch(e){
    console.warn('account session',e);
    accountCurrentSession=null;
    return null;
  }
}

async function accountLoadUsername(){
  const sess=await accountSession();
  if(!sess)return '';
  const client=accountGetClient();
  const {data,error}=await client.from('owner_manual_accounts').select('username').eq('user_id',sess.user.id).maybeSingle();
  if(error){console.warn('load username',error);return ''}
  accountUsername=data?.username||sess.user?.user_metadata?.username||'';
  accountRefreshIdentity();
  return accountUsername;
}

function accountRefreshIdentity(){
  const el=document.getElementById('cloudBottomEmail');
  if(!el)return;
  const email=accountCurrentSession?.user?.email||'';
  el.textContent=accountUsername||email||'Signed in';
  el.title=accountUsername&&email?`${accountUsername} • ${email}`:email;
}

function accountMessage(text,ok=false){
  const el=document.getElementById('cloudAccountStatus');
  if(!el)return;
  el.textContent=text||'';
  el.classList.toggle('ok',!!ok);
}

function accountEnsureDialog(){
  let dlg=document.getElementById('cloudAccountDlg');
  if(dlg)return dlg;
  dlg=document.createElement('dialog');
  dlg.id='cloudAccountDlg';
  dlg.innerHTML=`
    <div class="mh"><div><b>Account</b><div class="hint">Login and account settings.</div></div><button type="button" class="btn" id="cloudAccountClose">Close</button></div>
    <div class="mb cloudAccountBody">
      <section class="cloudAccountSection">
        <div class="cloudAccountSectionTitle">Username</div>
        <label for="cloudAccountUsername">Username</label>
        <input id="cloudAccountUsername" autocomplete="username" placeholder="3–24 letters, numbers, or underscores">
        <div class="cloudAccountHelp">Your username is saved to this account. Login still uses your email address.</div>
        <button type="button" class="btn primary" id="cloudAccountSaveUsername">Save Username</button>
      </section>
      <section class="cloudAccountSection">
        <div class="cloudAccountSectionTitle">Change Password</div>
        <label for="cloudAccountCurrentPassword">Current password</label>
        <input id="cloudAccountCurrentPassword" type="password" autocomplete="current-password">
        <label for="cloudAccountNewPassword">New password</label>
        <input id="cloudAccountNewPassword" type="password" autocomplete="new-password">
        <label for="cloudAccountConfirmPassword">Confirm new password</label>
        <input id="cloudAccountConfirmPassword" type="password" autocomplete="new-password">
        <button type="button" class="btn primary" id="cloudAccountChangePassword">Change Password</button>
      </section>
      <div id="cloudAccountStatus" class="cloudAccountStatus" aria-live="polite"></div>
    </div>`;
  document.body.appendChild(dlg);
  document.getElementById('cloudAccountClose').onclick=()=>dlg.close();
  document.getElementById('cloudAccountSaveUsername').onclick=accountSaveUsername;
  document.getElementById('cloudAccountChangePassword').onclick=accountChangePassword;
  return dlg;
}

async function accountOpen(){
  const dlg=accountEnsureDialog();
  accountMessage('');
  const sess=await accountSession(true);
  if(!sess){accountMessage('Your login session has expired. Sign in again.');dlg.showModal();return}
  await accountLoadUsername();
  document.getElementById('cloudAccountUsername').value=accountUsername||'';
  document.getElementById('cloudAccountCurrentPassword').value='';
  document.getElementById('cloudAccountNewPassword').value='';
  document.getElementById('cloudAccountConfirmPassword').value='';
  dlg.showModal();
}

async function accountSaveUsername(){
  const sess=await accountSession(true);
  if(!sess){accountMessage('Your login session has expired. Sign in again.');return}
  const client=accountGetClient();
  const input=document.getElementById('cloudAccountUsername');
  const username=String(input.value||'').trim().toLowerCase();
  input.value=username;
  if(!/^[a-z0-9_]{3,24}$/.test(username)){
    accountMessage('Use 3–24 lowercase letters, numbers, or underscores.');
    return;
  }
  const btn=document.getElementById('cloudAccountSaveUsername');
  btn.disabled=true;btn.textContent='Saving…';accountMessage('');
  try{
    const {error}=await client.from('owner_manual_accounts').upsert({user_id:sess.user.id,username},{onConflict:'user_id'});
    if(error){
      const msg=String(error.message||'');
      console.warn('save username',error);
      accountMessage(msg.toLowerCase().includes('unique')||String(error.code)==='23505'?'That username is already in use.':'Could not save username.');
      return;
    }
    const {data:userData,error:metaError}=await client.auth.updateUser({data:{username}});
    if(metaError)console.warn('username metadata',metaError);
    accountUsername=username;
    if(userData?.user&&accountCurrentSession)accountCurrentSession={...accountCurrentSession,user:userData.user};
    accountRefreshIdentity();
    accountMessage('Username saved.',true);
  }finally{
    btn.disabled=false;btn.textContent='Save Username';
  }
}

async function accountChangePassword(){
  const sess=await accountSession(true);
  if(!sess){accountMessage('Your login session has expired. Sign in again.');return}
  const client=accountGetClient();
  const current=document.getElementById('cloudAccountCurrentPassword').value;
  const next=document.getElementById('cloudAccountNewPassword').value;
  const confirmNext=document.getElementById('cloudAccountConfirmPassword').value;
  if(!current||!next||!confirmNext){accountMessage('Fill in all three password fields.');return}
  if(next!==confirmNext){accountMessage('The new passwords do not match.');return}
  if(next.length<6){accountMessage('The new password must be at least 6 characters.');return}
  if(next===current){accountMessage('Choose a new password different from the current one.');return}
  const btn=document.getElementById('cloudAccountChangePassword');
  btn.disabled=true;btn.textContent='Changing…';accountMessage('');
  try{
    const {data,error}=await client.auth.updateUser({password:next,currentPassword:current});
    if(error){
      console.warn('change password',error);
      const msg=String(error.message||'');
      accountMessage(/current|password|invalid|credential/i.test(msg)?'Current password is incorrect, or the new password was rejected.':msg||'Could not change password.');
      return;
    }
    if(data?.user&&accountCurrentSession)accountCurrentSession={...accountCurrentSession,user:data.user};
    document.getElementById('cloudAccountCurrentPassword').value='';
    document.getElementById('cloudAccountNewPassword').value='';
    document.getElementById('cloudAccountConfirmPassword').value='';
    accountMessage('Password changed successfully.',true);
  }finally{
    btn.disabled=false;btn.textContent='Change Password';
  }
}

function accountInstall(){
  if(accountInstalled)return true;
  const bottom=document.getElementById('cloudBottom');
  const signOut=document.getElementById('cloudSignOut');
  if(!bottom||!signOut)return false;
  if(!document.getElementById('cloudAccountBtn')){
    const b=document.createElement('button');
    b.type='button';b.className='btn';b.id='cloudAccountBtn';b.textContent='Account';
    b.onclick=accountOpen;
    bottom.insertBefore(b,signOut);
  }
  accountEnsureDialog();
  accountSession(true).then(()=>accountLoadUsername());
  accountSetVersion();
  setTimeout(accountSetVersion,300);
  setTimeout(accountSetVersion,1200);
  setTimeout(accountSetVersion,2200);
  accountInstalled=true;
  return true;
}

if(!accountInstall()){
  const obs=new MutationObserver(()=>{if(accountInstall())obs.disconnect()});
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>{if(accountInstall())obs.disconnect()},1500);
}
})();
