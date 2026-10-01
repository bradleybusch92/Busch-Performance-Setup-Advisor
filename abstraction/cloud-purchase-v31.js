(() => {
'use strict';

const byId=id=>document.getElementById(id);
const needsPurchase=c=>c?.needsPurchase===true||c?.needsPurchase==='yes'||c?.needsPurchase==='true';

function installEditFields(){
  const grid=byId('editForm')?.querySelector('.grid2');
  const link=byId('link')?.closest('.field');
  if(!grid||!link)return false;

  if(!byId('phone')){
    const field=document.createElement('div');
    field.className='field cloudPurchasePhoneField';
    field.innerHTML='<label>Purchase / Vendor Phone</label><input id="phone" type="tel" autocomplete="tel">';
    grid.insertBefore(field,link);
  }

  if(!byId('needsPurchase')){
    const field=document.createElement('div');
    field.className='field cloudPurchaseFlagField';
    field.innerHTML='<label>Purchase Status</label><label class="cloudPurchaseCheck"><input id="needsPurchase" type="checkbox"><span>Needs to be purchased</span></label>';
    link.insertAdjacentElement('afterend',field);
  }
  return true;
}

function installDetailFields(){
  const link=byId('dLink')?.closest('.box');
  if(!link)return false;
  const linkTitle=link.querySelector('h4');
  if(linkTitle)linkTitle.textContent='Reference / Purchase Link';

  if(!byId('dPhone')){
    const box=document.createElement('div');
    box.className='box cloudPurchasePhoneBox';
    box.innerHTML='<h4>Purchase / Vendor Phone</h4><div id="dPhone">—</div>';
    link.parentElement.insertBefore(box,link);
  }

  if(!byId('cloudPurchaseDetailBadge')){
    const meta=byId('dMeta');
    if(meta){
      const badge=document.createElement('span');
      badge.id='cloudPurchaseDetailBadge';
      badge.className='cloudPurchaseDetailBadge hidden';
      badge.textContent='NEEDS PURCHASE';
      meta.insertAdjacentElement('afterend',badge);
    }
  }
  return true;
}

function setPhoneDetail(value){
  const host=byId('dPhone');
  if(!host)return;
  host.textContent='';
  const phone=String(value||'').trim();
  if(!phone){host.textContent='—';return}
  const a=document.createElement('a');
  a.textContent=phone;
  a.href='tel:'+phone.replace(/[^0-9+]/g,'');
  a.className='cloudPurchasePhoneLink';
  host.appendChild(a);
}

function updateDetailExtras(c){
  setPhoneDetail(c?.phone||'');
  const badge=byId('cloudPurchaseDetailBadge');
  if(badge)badge.classList.toggle('hidden',!needsPurchase(c));
}

function purchaseCard(c){
  const flag=needsPurchase(c);
  return `<div class="card${flag?' cloudNeedsPurchase':''}" data-part="${esc(c.id)}"><b>${esc(c.title)}</b><div class="meta">${esc(c.system||'Uncategorized')} • ${esc(c.manufacturer||'Manufacturer TBD')}${c.partNumber?' • '+esc(c.partNumber):''}</div>${flag?'<span class="tag cloudPurchaseTag">NEEDS PURCHASE</span>':''}<span class="tag">${esc(c.location)}</span>${!c.partNumber?'<span class="tag tbd">TBD DATA</span>':''}</div>`;
}

function installFunctionWrappers(){
  const originalEdit=edit;
  edit=function(c){
    const r=originalEdit(c);
    const phone=byId('phone');
    const flag=byId('needsPurchase');
    if(phone)phone.value=c?.phone||'';
    if(flag)flag.checked=needsPurchase(c);
    return r;
  };

  const originalOpenDetail=openDetail;
  openDetail=function(id){
    const r=originalOpenDetail(id);
    const c=(state.components||[]).find(x=>x.id===id);
    updateDetailExtras(c);
    return r;
  };

  partCard=purchaseCard;
  renderParts=function(){
    const list=(state.components||[])
      .filter(c=>c.location===currentArea)
      .sort((a,b)=>Number(needsPurchase(b))-Number(needsPurchase(a))||(a.system||'').localeCompare(b.system||'')||String(a.title||'').localeCompare(String(b.title||'')));
    byId('partsPane').innerHTML=`<div class="parts">${list.length?list.map(purchaseCard).join(''):'<div class="empty">No permanent components recorded here yet.</div>'}</div>`;
    document.querySelectorAll('#partsPane [data-part]').forEach(el=>el.onclick=()=>openDetail(el.dataset.part));
  };
}

function installSaveHandler(){
  document.addEventListener('submit',async e=>{
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

    const i=(state.components||[]).findIndex(x=>x.id===c.id);
    if(i>=0)state.components[i]=c;
    else{
      if(!Array.isArray(c.files))c.files=[];
      state.components.push(c);
    }

    if(typeof save==='function')save();
    byId('editDlg')?.close();
    if(typeof renderAll==='function')renderAll();
    const area=byId('area');
    if(area&&!area.classList.contains('hidden')&&typeof renderArea==='function')renderArea();
    if(typeof toast==='function')toast('Component saved');

    if(typeof window.__abstractionDirectSave==='function')await window.__abstractionDirectSave();
  },true);
}

function install(){
  if(window.__cloudPurchaseV31Installed)return true;
  if(!installEditFields()||!installDetailFields())return false;
  window.__cloudPurchaseV31Installed=true;
  installFunctionWrappers();
  installSaveHandler();
  return true;
}

if(!install()){
  const obs=new MutationObserver(()=>{
    if(install())obs.disconnect();
  });
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>{if(install())obs.disconnect()},1200);
}
})();
