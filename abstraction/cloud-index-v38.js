(() => {
'use strict';

/* Parts Index vendor column/sort - v2026.10.09.38
   Presentation/filtering only. Does not mutate component data or cloud state. */

const byId=id=>document.getElementById(id);
const needsPurchase=c=>c?.needsPurchase===true||c?.needsPurchase==='yes'||c?.needsPurchase==='true';
const alpha=(a,b)=>String(a??'').localeCompare(String(b??''),undefined,{numeric:true,sensitivity:'base'});

function ensureVendorIndexControls(){
  const q=byId('q');
  if(q)q.placeholder='Search component, manufacturer, vendor, part #, purchase status...';

  const sort=byId('sortFilter');
  if(sort&&!Array.from(sort.options).some(o=>o.value==='source')){
    const opt=document.createElement('option');
    opt.value='source';
    opt.textContent='Sort: Vendor';
    const manufacturer=Array.from(sort.options).find(o=>o.value==='manufacturer');
    if(manufacturer)manufacturer.insertAdjacentElement('afterend',opt);
    else sort.appendChild(opt);
  }

  const head=byId('index')?.querySelector('thead tr');
  if(head)head.innerHTML='<th>Component</th><th>Location</th><th>System</th><th>Manufacturer</th><th>Vendor</th><th>Part #</th><th>Type</th><th>Needs Purchase</th>';
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

function renderIndexV38(){
  ensureVendorIndexControls();
  refillFilterOptions();

  const q=String(byId('q')?.value||'').trim().toLowerCase();
  const loc=byId('locFilter')?.value||'';
  const sys=byId('sysFilter')?.value||'';
  const purchase=byId('purchaseFilter')?.value||'';
  const sortField=byId('sortFilter')?.value||'title';

  const rows=(state.components||[])
    .filter(c=>{
      const haystack=[
        c.title,c.location,c.system,c.manufacturer,c.source,c.partNumber,c.type,
        c.summary,c.notes,c.phone,purchaseSearchText(c)
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
    <td>${esc(c.source||'—')}</td>
    <td>${esc(c.partNumber||'—')}</td>
    <td>${esc(c.type||'—')}</td>
    <td>${needsPurchase(c)?'<span class="cloudIndexPurchaseYes">NEEDS PURCHASE</span>':'<span class="cloudIndexPurchaseNo">—</span>'}</td>
  </tr>`).join('');

  document.querySelectorAll('#tbody [data-part]').forEach(el=>el.onclick=()=>openDetail(el.dataset.part));
}

renderIndex=renderIndexV38;
ensureVendorIndexControls();
['q','locFilter','sysFilter','purchaseFilter','sortFilter'].forEach(id=>{
  const el=byId(id);
  if(el){
    el.oninput=renderIndexV38;
    el.onchange=renderIndexV38;
  }
});

const index=byId('index');
if(index&&!index.classList.contains('hidden'))renderIndexV38();
})();