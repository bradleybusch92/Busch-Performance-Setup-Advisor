(() => {
'use strict';

/* v32: save interception for purchase-only component fields.
   This runs at WINDOW capture phase so it executes before the older protected
   document-level v17 component save bridge. That prevents the older bridge
   from rebuilding a component without phone / needsPurchase. */

const byId=id=>document.getElementById(id);

async function saveComponentWithPurchaseFields(e){
  if(e.target?.id!=='editForm')return;

  e.preventDefault();
  e.stopImmediatePropagation();

  const id=byId('id')?.value||'';
  const existing=(state.components||[]).find(x=>x.id===id);
  const c=existing?JSON.parse(JSON.stringify(existing)):{};

  const names=['id','title','location','system','type','manufacturer','partNumber','summary','specs','service','notes','rule','source','link'];
  names.forEach(k=>c[k]=byId(k)?.value||'');
  c.phone=(byId('phone')?.value||'').trim();
  c.needsPurchase=!!byId('needsPurchase')?.checked;

  if(!String(c.title||'').trim())return;
  if(!c.id)c.id='e'+Date.now();
  if(!Array.isArray(c.files))c.files=[];

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
}

window.addEventListener('submit',saveComponentWithPurchaseFields,true);
})();
