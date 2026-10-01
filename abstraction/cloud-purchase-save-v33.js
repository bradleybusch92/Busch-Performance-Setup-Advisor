(() => {
'use strict';

/* v33: explicit component Save button handler.
   The purchase fields are saved from the button click itself instead of relying
   on the older form-submit pipeline. This leaves the proven cloud writer intact. */

const byId=id=>document.getElementById(id);
let busy=false;

function buildComponentFromEditor(){
  const id=byId('id')?.value||'';
  const existing=(state.components||[]).find(x=>x.id===id);
  const c=existing?JSON.parse(JSON.stringify(existing)):{};

  const names=['id','title','location','system','type','manufacturer','partNumber','summary','specs','service','notes','rule','source','link'];
  names.forEach(k=>c[k]=byId(k)?.value||'');
  c.phone=(byId('phone')?.value||'').trim();
  c.needsPurchase=!!byId('needsPurchase')?.checked;

  if(!String(c.title||'').trim())return null;
  if(!c.id)c.id='e'+Date.now();
  if(!Array.isArray(c.files))c.files=[];
  return c;
}

async function saveFromEditor(){
  if(busy)return;
  const c=buildComponentFromEditor();
  if(!c)return;
  busy=true;

  const btn=byId('editForm')?.querySelector('button[data-purchase-save-v33]');
  const oldText=btn?.textContent||'Save';
  if(btn){btn.disabled=true;btn.textContent='Saving…'}

  try{
    const i=(state.components||[]).findIndex(x=>x.id===c.id);
    if(i>=0)state.components[i]=c;
    else state.components.push(c);

    if(typeof save==='function')save();
    byId('editDlg')?.close();

    if(typeof renderAll==='function')renderAll();
    const area=byId('area');
    if(area&&!area.classList.contains('hidden')&&typeof renderArea==='function')renderArea();
    if(typeof toast==='function')toast('Component saved');

    if(typeof window.__abstractionDirectSave==='function'){
      await window.__abstractionDirectSave();
    }
  }finally{
    busy=false;
    if(btn){btn.disabled=false;btn.textContent=oldText}
  }
}

function installButtonHandler(){
  const form=byId('editForm');
  if(!form)return false;
  const btn=form.querySelector('button[type="submit"], button[data-purchase-save-v33]');
  if(!btn)return false;

  /* Turning this into a normal button prevents the legacy submit handlers from
     rebuilding the component without the new purchase fields. */
  btn.type='button';
  btn.setAttribute('data-purchase-save-v33','1');
  btn.onclick=e=>{
    e.preventDefault();
    e.stopPropagation();
    saveFromEditor();
  };

  /* Preserve Enter-key saving without allowing the legacy submit path through. */
  window.addEventListener('submit',e=>{
    if(e.target!==form)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    saveFromEditor();
  },true);

  /* Give immediate visible feedback when the purchase flag is clicked. */
  const flag=byId('needsPurchase');
  const row=flag?.closest('.cloudPurchaseCheck');
  if(flag&&row){
    const reflect=()=>row.classList.toggle('checked',flag.checked);
    flag.addEventListener('change',reflect);
    reflect();
  }
  return true;
}

if(!installButtonHandler()){
  const obs=new MutationObserver(()=>{if(installButtonHandler())obs.disconnect()});
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>{if(installButtonHandler())obs.disconnect()},1000);
}
})();
