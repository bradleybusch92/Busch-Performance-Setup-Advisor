(() => {
'use strict';

/* v34: allow purchase-needed status to be toggled directly from the
   Parts & Components list and component detail view, without entering Edit. */

const byId=id=>document.getElementById(id);
const needsPurchase=c=>c?.needsPurchase===true||c?.needsPurchase==='yes'||c?.needsPurchase==='true';
let purchaseToggleBusy=false;

function quickCard(c){
  const flag=needsPurchase(c);
  return `<div class="card${flag?' cloudNeedsPurchase':''}" data-part="${esc(c.id)}">
    <div class="cloudPartCardHead">
      <b>${esc(c.title)}</b>
      <button type="button" class="cloudPurchaseQuick${flag?' active':''}" data-purchase-toggle="${esc(c.id)}" aria-pressed="${flag?'true':'false'}">${flag?'NEEDS PURCHASE':'Mark to Buy'}</button>
    </div>
    <div class="meta">${esc(c.system||'Uncategorized')} • ${esc(c.manufacturer||'Manufacturer TBD')}${c.partNumber?' • '+esc(c.partNumber):''}</div>
    <span class="tag">${esc(c.location)}</span>${!c.partNumber?'<span class="tag tbd">TBD DATA</span>':''}
  </div>`;
}

function bindPartList(){
  document.querySelectorAll('#partsPane [data-part]').forEach(el=>{
    el.onclick=e=>{
      if(e.target?.closest?.('[data-purchase-toggle]'))return;
      openDetail(el.dataset.part);
    };
  });
  document.querySelectorAll('#partsPane [data-purchase-toggle]').forEach(btn=>{
    btn.onclick=e=>togglePurchase(btn.dataset.purchaseToggle,e);
  });
}

function renderPurchaseParts(){
  const list=(state.components||[])
    .filter(c=>c.location===currentArea)
    .sort((a,b)=>Number(needsPurchase(b))-Number(needsPurchase(a))||(a.system||'').localeCompare(b.system||'')||String(a.title||'').localeCompare(String(b.title||'')));
  byId('partsPane').innerHTML=`<div class="parts">${list.length?list.map(quickCard).join(''):'<div class="empty">No permanent components recorded here yet.</div>'}</div>`;
  bindPartList();
}

function ensureDetailToggle(){
  const editBtn=byId('editBtn');
  if(!editBtn)return null;
  let btn=byId('cloudPurchaseDetailToggle');
  if(!btn){
    btn=document.createElement('button');
    btn.type='button';
    btn.id='cloudPurchaseDetailToggle';
    btn.className='btn cloudPurchaseDetailToggle';
    editBtn.insertAdjacentElement('afterend',btn);
    btn.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      if(detailId)togglePurchase(detailId,e,true);
    };
  }
  return btn;
}

function refreshDetailToggle(c){
  const btn=ensureDetailToggle();
  if(!btn)return;
  const flag=needsPurchase(c);
  btn.textContent=flag?'Remove Purchase Flag':'Mark to Buy';
  btn.classList.toggle('active',flag);
  btn.setAttribute('aria-pressed',flag?'true':'false');
}

async function togglePurchase(id,e,fromDetail=false){
  e?.preventDefault?.();
  e?.stopPropagation?.();
  e?.stopImmediatePropagation?.();
  if(purchaseToggleBusy)return;
  const c=(state.components||[]).find(x=>x.id===id);
  if(!c)return;

  purchaseToggleBusy=true;
  c.needsPurchase=!needsPurchase(c);
  if(typeof save==='function')save();

  /* Re-render immediately so the item moves into/out of the purchase group. */
  if(typeof renderParts==='function')renderParts();
  if(fromDetail){
    refreshDetailToggle(c);
    const badge=byId('cloudPurchaseDetailBadge');
    if(badge)badge.classList.toggle('hidden',!needsPurchase(c));
  }
  if(typeof toast==='function')toast(c.needsPurchase?'Marked as needing purchase':'Purchase flag removed');

  try{
    if(typeof window.__abstractionDirectSave==='function')await window.__abstractionDirectSave();
  }finally{
    purchaseToggleBusy=false;
  }
}

/* Replace only the Parts & Components presentation/sort function. */
partCard=quickCard;
renderParts=renderPurchaseParts;

/* Keep the detail-view quick toggle synchronized whenever a part is opened. */
const previousOpenDetail=openDetail;
openDetail=function(id){
  const r=previousOpenDetail(id);
  const c=(state.components||[]).find(x=>x.id===id);
  refreshDetailToggle(c);
  return r;
};

ensureDetailToggle();

/* If the area is already open when this file loads, refresh its part cards. */
const area=byId('area');
if(area&&!area.classList.contains('hidden'))renderPurchaseParts();
})();