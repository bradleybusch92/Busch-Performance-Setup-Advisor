(() => {
'use strict';

/* v35
   - Parts Index defaults to Component A-Z.
   - Adds purchase-status filtering and searchable purchase status.
   - Adds selectable A-Z sorting by any displayed component field.
   - Keeps purchase-needed parts pinned first in each individual area, while
     alphabetizing the purchase group and the normal group by component name. */

const byId=id=>document.getElementById(id);
const needsPurchase=c=>c?.needsPurchase===true||c?.needsPurchase==='yes'||c?.needsPurchase==='true';
const alpha=(a,b)=>String(a??'').localeCompare(String(b??''),undefined,{numeric:true,sensitivity:'base'});

function ensureIndexControls(){
  const search=byId('index')?.querySelector('.search');
  if(!search)return false;

  const q=byId('q');
  if(q)q.placeholder='Search component, manufacturer, part #, purchase status...';

  if(!byId('purchaseFilter')){
    const sel=document.createElement('select');
    sel.id='purchaseFilter';
    sel.setAttribute('aria-label','Purchase status filter');
    sel.innerHTML='<option value="">Purchase: All</option><option value="yes">Purchase: Needs Purchase</option><option value="no">Purchase: Not Needed</option>';
    search.appendChild(sel);
  }

  if(!byId('sortFilter')){
    const sel=document.createElement('select');
    sel.id='sortFilter';
    sel.setAttribute('aria-label','Sort parts index');
    sel.innerHTML=[
      ['title','Sort: Component'],
      ['location','Sort: Location'],
      ['system','Sort: System'],
      ['manufacturer','Sort: Manufacturer'],
      ['partNumber','Sort: Part #'],
      ['type','Sort: Type'],
      ['needsPurchase','Sort: Needs Purchase']
    ].map(([v,t])=>`<option value="${v}">${t}</option>`).join('');
    sel.value='title';
    search.appendChild(sel);
  }

  const head=byId('index')?.querySelector('thead tr');
  if(head)head.innerHTML='<th>Component</th><th>Location</th><th>System</th><th>Manufacturer</th><th>Part #</th><th>Type</th><th>Needs Purchase</th>';
  return true;
}

function refillFilterOptions(){
  const locSel=byId('locFilter'),sysSel=byId('sysFilter');
  if(!locSel||!sysSel)return;
  const oldLoc=locSel.value,oldSys=sysSel.value;
  const loc=[...new Set((state.components||[]).map(c=>c.location).filter(Boolean))].sort(alpha);
  const sys=[...new Set((state.components||[]).map(c=>c.system).filter(Boolean))].sort(alpha);
  locSel.innerHTML='<option value="">All locations</option>'+loc.map(x=>`<option>${esc(x)}</option>`).join('');
  sysSel.innerHTML='<option value="">All systems</option>'+sys.map(x=>`<option>${esc(x)}</option>`).join('');
  if(loc.includes(oldLoc))locSel.value=oldLoc;
  if(sys.includes(oldSys))sysSel.value=oldSys;
}

function fieldValue(c,field){
  if(field==='needsPurchase')return needsPurchase(c)?'Needs Purchase':'Not Needed';
  return c?.[field]??'';
}

function compareByField(a,b,field){
  const av=String(fieldValue(a,field)||'').trim();
  const bv=String(fieldValue(b,field)||'').trim();
  if(!av&&bv)return 1;
  if(av&&!bv)return -1;
  const first=alpha(av,bv);
  return first||alpha(a?.title,b?.title);
}

function purchaseSearchText(c){
  return needsPurchase(c)
    ? 'needs purchase purchase needed needs to be purchased mark to buy yes'
    : 'not needed no purchase purchase not needed no';
}

function renderIndexV35(){
  ensureIndexControls();
  refillFilterOptions();

  const q=String(byId('q')?.value||'').trim().toLowerCase();
  const loc=byId('locFilter')?.value||'';
  const sys=byId('sysFilter')?.value||'';
  const purchase=byId('purchaseFilter')?.value||'';
  const sortField=byId('sortFilter')?.value||'title';

  const rows=(state.components||[])
    .filter(c=>{
      const haystack=[
        c.title,c.location,c.system,c.manufacturer,c.partNumber,c.type,
        c.summary,c.notes,c.source,c.phone,purchaseSearchText(c)
      ].join(' ').toLowerCase();
      if(q&&!haystack.includes(q))return false;
      if(loc&&c.location!==loc)return false;
      if(sys&&c.system!==sys)return false;
      if(purchase==='yes'&&!needsPurchase(c))return false;
      if(purchase==='no'&&needsPurchase(c))return false;
      return true;
    })
    .sort((a,b)=>compareByField(a,b,sortField));

  const tbody=byId('tbody');
  if(!tbody)return;
  tbody.innerHTML=rows.map(c=>`<tr data-part="${esc(c.id)}">
    <td><b>${esc(c.title)}</b></td>
    <td>${esc(c.location||'—')}</td>
    <td>${esc(c.system||'—')}</td>
    <td>${esc(c.manufacturer||'—')}</td>
    <td>${esc(c.partNumber||'—')}</td>
    <td>${esc(c.type||'—')}</td>
    <td>${needsPurchase(c)?'<span class="cloudIndexPurchaseYes">NEEDS PURCHASE</span>':'<span class="cloudIndexPurchaseNo">—</span>'}</td>
  </tr>`).join('');

  document.querySelectorAll('#tbody [data-part]').forEach(el=>el.onclick=()=>openDetail(el.dataset.part));
}

/* Replace the index renderer and rebind the controls. The original handlers
   were assigned before this enhancement loaded, so they must be rebound to
   the new renderer explicitly. */
renderIndex=renderIndexV35;
ensureIndexControls();
['q','locFilter','sysFilter','purchaseFilter','sortFilter'].forEach(id=>{
  const el=byId(id);
  if(el){
    el.oninput=renderIndexV35;
    el.onchange=renderIndexV35;
  }
});

/* Preserve the existing quick purchase buttons and their cloud-save behavior.
   After v34 renders/binds the cards, reorder the DOM so purchase-needed parts
   stay at the top and each group is strictly Component A-Z. */
const previousRenderParts=renderParts;
renderParts=function(){
  previousRenderParts();
  const grid=byId('partsPane')?.querySelector('.parts');
  if(!grid)return;
  const cards=[...grid.querySelectorAll('.card[data-part]')];
  cards.sort((a,b)=>{
    const ap=a.classList.contains('cloudNeedsPurchase');
    const bp=b.classList.contains('cloudNeedsPurchase');
    if(ap!==bp)return ap?-1:1;
    return alpha(a.querySelector('b')?.textContent,b.querySelector('b')?.textContent);
  });
  cards.forEach(card=>grid.appendChild(card));
};

/* Refresh whichever relevant view is already visible. */
const index=byId('index');
if(index&&!index.classList.contains('hidden'))renderIndexV35();
const area=byId('area');
if(area&&!area.classList.contains('hidden')&&typeof renderParts==='function')renderParts();
})();
