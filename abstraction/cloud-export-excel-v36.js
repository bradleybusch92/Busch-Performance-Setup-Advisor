(() => {
'use strict';

/* Excel workbook export - v2026.10.07.36
   READ ONLY: this module never mutates state, localStorage, Supabase, files,
   profiles, schemas, or components. It exports a deep-cloned snapshot only. */

const byId=id=>document.getElementById(id);
const XLSX_LIB='https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
const AREA_ORDER=['General Setup','LF','RF','LR','RR','Front End','Engine','Cockpit','Rear End'];
let exporting=false;

function clone(v){return JSON.parse(JSON.stringify(v))}
function flag(c){return c?.needsPurchase===true||c?.needsPurchase==='true'||c?.needsPurchase==='yes'}
function text(v){return v===null||v===undefined?'':String(v)}
function excelDateStamp(){
  const d=new Date(),p=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}
function safeFilename(s){
  return text(s||'Abstraction').replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,' ').trim()||'Abstraction';
}
function sheetSafe(name,used){
  let s=text(name).replace(/[\\/*?:\[\]]/g,' ').trim()||'Sheet';
  s=s.slice(0,31);
  let base=s,n=2;
  while(used.has(s)){const suffix=' '+n++;s=(base.slice(0,31-suffix.length)+suffix)}
  used.add(s);return s;
}
function allAreas(snapshot){
  const found=new Set([...AREA_ORDER,...Object.keys(snapshot.schemas||{})]);
  return [...found].sort((a,b)=>{
    const ia=AREA_ORDER.indexOf(a),ib=AREA_ORDER.indexOf(b);
    if(ia>=0||ib>=0)return (ia<0?999:ia)-(ib<0?999:ib);
    return a.localeCompare(b);
  });
}
function loadExcelJS(){
  if(window.ExcelJS)return Promise.resolve(window.ExcelJS);
  return new Promise((resolve,reject)=>{
    let s=byId('cloudExcelJsV36');
    if(s){
      s.addEventListener('load',()=>resolve(window.ExcelJS),{once:true});
      s.addEventListener('error',()=>reject(new Error('Excel library failed to load.')),{once:true});
      return;
    }
    s=document.createElement('script');
    s.id='cloudExcelJsV36';
    s.src=XLSX_LIB;
    s.onload=()=>window.ExcelJS?resolve(window.ExcelJS):reject(new Error('Excel library did not initialize.'));
    s.onerror=()=>reject(new Error('Excel library failed to load.'));
    document.head.appendChild(s);
  });
}

const C={
  dark:'161616', dark2:'242424', gray:'6F6F6F', line:'C9C9C9',
  light:'F3F3F3', white:'FFFFFF', red:'A61B1B', redLight:'F7E7E7',
  greenLight:'E8F2E8'
};

function titleRow(ws,title,subtitle,lastCol){
  ws.mergeCells(1,1,1,lastCol);
  const c=ws.getCell(1,1);c.value=title;
  c.font={bold:true,size:18,color:{argb:C.white}};
  c.fill={type:'pattern',pattern:'solid',fgColor:{argb:C.dark}};
  c.alignment={vertical:'middle'};
  ws.getRow(1).height=28;
  if(subtitle){
    ws.mergeCells(2,1,2,lastCol);
    const s=ws.getCell(2,1);s.value=subtitle;
    s.font={italic:true,size:10,color:{argb:'666666'}};
    ws.getRow(2).height=18;
  }
}
function styleHeader(row){
  row.font={bold:true,color:{argb:C.white}};
  row.fill={type:'pattern',pattern:'solid',fgColor:{argb:C.dark2}};
  row.alignment={vertical:'middle'};
  row.height=21;
  row.eachCell(c=>{
    c.border={bottom:{style:'thin',color:{argb:C.line}}};
  });
}
function thinGrid(ws,startRow,endRow,startCol,endCol){
  if(endRow<startRow)return;
  for(let r=startRow;r<=endRow;r++){
    for(let c=startCol;c<=endCol;c++){
      const cell=ws.getCell(r,c);
      cell.border={
        bottom:{style:'hair',color:{argb:'E1E1E1'}}
      };
      cell.alignment={vertical:'top',wrapText:true};
    }
  }
}
function setWidths(ws,widths){widths.forEach((w,i)=>ws.getColumn(i+1).width=w)}
function addAutoFilter(ws,headerRow,colCount,lastRow){
  if(lastRow>=headerRow)ws.autoFilter={from:{row:headerRow,column:1},to:{row:lastRow,column:colCount}};
}
function addLinkCell(cell,url,label){
  const u=text(url).trim();
  if(!u){cell.value='';return}
  cell.value={text:label||u,hyperlink:u};
  cell.font={color:{argb:'0563C1'},underline:true};
}
function activeProfile(snapshot){
  return (snapshot.profiles||[]).find(p=>p.id===snapshot.activeProfileId)||(snapshot.profiles||[])[0]||null;
}
function carName(snapshot){
  const p=activeProfile(snapshot);
  return p?.sections?.['General Setup']?.values?.Car||'Abstraction';
}

function buildOverview(wb,snapshot,used){
  const ws=wb.addWorksheet(sheetSafe('Overview',used),{views:[{state:'frozen',ySplit:3}]});
  titleRow(ws,"Abstraction Owner's Manual",'Workbook export from the authoritative Owner’s Manual data',6);
  ws.getRow(4).values=['Summary','Value','','Area','Components','Needs Purchase'];
  styleHeader(ws.getRow(4));
  const profiles=snapshot.profiles||[],components=snapshot.components||[],areas=allAreas(snapshot);
  const ap=activeProfile(snapshot);
  const summary=[
    ['Car',carName(snapshot)],
    ['Exported',new Date().toLocaleString()],
    ['Active Setup Profile',ap?.name||''],
    ['Setup Profiles',profiles.length],
    ['Components',components.length],
    ['Needs Purchase',components.filter(flag).length],
    ['Attached Files',countFiles(snapshot)]
  ];
  summary.forEach((x,i)=>{ws.getCell(5+i,1).value=x[0];ws.getCell(5+i,2).value=x[1]});
  areas.forEach((a,i)=>{
    const list=components.filter(c=>c.location===a);
    ws.getCell(5+i,4).value=a==='General Setup'?'General':a;
    ws.getCell(5+i,5).value=list.length;
    ws.getCell(5+i,6).value=list.filter(flag).length;
  });
  ws.getColumn(1).font={bold:true};
  ws.getColumn(4).font={bold:true};
  thinGrid(ws,5,Math.max(11,4+areas.length),1,6);
  setWidths(ws,[24,30,4,20,14,16]);
}

function componentRow(c){
  return [
    text(c.title),text(c.location),text(c.system),text(c.manufacturer),text(c.partNumber),
    text(c.type),flag(c)?'YES':'NO',text(c.source),text(c.phone),text(c.link),
    text(c.summary),text(c.specs),text(c.service),text(c.notes),text(c.rule)
  ];
}
function buildPartsSheet(wb,snapshot,used,name,onlyPurchase){
  const ws=wb.addWorksheet(sheetSafe(name,used),{views:[{state:'frozen',ySplit:3}]});
  const headers=['Component','Location','System','Manufacturer','Part #','Type','Needs Purchase','Vendor / Source','Phone','Purchase Link','Summary','Specifications','Service / Setup Notes','General Notes','Rule / Legality Notes'];
  titleRow(ws,name,onlyPurchase?'Components currently marked as needing purchase':'Complete component index',headers.length);
  ws.getRow(3).values=headers;styleHeader(ws.getRow(3));
  const items=(snapshot.components||[]).filter(c=>!onlyPurchase||flag(c)).slice().sort((a,b)=>text(a.title).localeCompare(text(b.title)));
  items.forEach((c,i)=>{
    const r=4+i,row=ws.getRow(r),vals=componentRow(c);
    row.values=vals;
    if(c.link)addLinkCell(ws.getCell(r,10),c.link,'Open purchase/reference link');
    if(flag(c)){
      ws.getCell(r,7).fill={type:'pattern',pattern:'solid',fgColor:{argb:C.redLight}};
      ws.getCell(r,7).font={bold:true,color:{argb:C.red}};
    }
  });
  thinGrid(ws,4,3+items.length,1,headers.length);
  addAutoFilter(ws,3,headers.length,Math.max(3,3+items.length));
  setWidths(ws,[30,16,20,22,18,22,15,22,17,28,36,40,38,38,38]);
  [11,12,13,14,15].forEach(c=>ws.getColumn(c).alignment={wrapText:true,vertical:'top'});
}
function buildProfiles(wb,snapshot,used){
  const ws=wb.addWorksheet(sheetSafe('Setup Profiles',used),{views:[{state:'frozen',ySplit:3}]});
  const headers=['Profile','Active','Car','Driver','Track','Date','Left %','Rear %','Total Weight','Profile ID'];
  titleRow(ws,'Setup Profiles','All saved setup profiles',headers.length);
  ws.getRow(3).values=headers;styleHeader(ws.getRow(3));
  (snapshot.profiles||[]).forEach((p,i)=>{
    const g=p?.sections?.['General Setup']?.values||{};
    ws.getRow(4+i).values=[p.name,p.id===snapshot.activeProfileId?'YES':'NO',g.Car||'',g.Driver||'',g.Track||'',g.Date||'',g['Left Percent']||'',g['Rear Percent']||'',g['Total Weight']||'',p.id||''];
  });
  thinGrid(ws,4,3+(snapshot.profiles||[]).length,1,headers.length);
  addAutoFilter(ws,3,headers.length,Math.max(3,3+(snapshot.profiles||[]).length));
  setWidths(ws,[28,10,18,20,22,16,12,12,16,26]);
}

function buildSetupArea(wb,snapshot,used,area){
  const profiles=snapshot.profiles||[];
  const fields=(snapshot.schemas?.[area]||[]).slice();
  const display=area==='General Setup'?'General':area;
  const lastCol=Math.max(2,1+profiles.length);
  const ws=wb.addWorksheet(sheetSafe(display,used),{views:[{state:'frozen',xSplit:1,ySplit:3}]});
  titleRow(ws,display+' Setup / Measurements','Rows are measurements; columns are setup profiles',lastCol);
  const headers=['Measurement',...profiles.map(p=>p.name+(p.id===snapshot.activeProfileId?' (Active)':''))];
  ws.getRow(3).values=headers;styleHeader(ws.getRow(3));

  let r=4;
  if(!fields.length){
    ws.getCell(r,1).value='No setup fields defined';
    r++;
  }else{
    fields.forEach(f=>{
      ws.getCell(r,1).value=f;
      ws.getCell(r,1).font={bold:true};
      profiles.forEach((p,i)=>ws.getCell(r,2+i).value=p?.sections?.[area]?.values?.[f]??'');
      r++;
    });
  }
  r++;
  ws.getCell(r,1).value='SECTION NOTES';ws.getCell(r,1).font={bold:true,color:{argb:C.white}};
  for(let c=1;c<=lastCol;c++)ws.getCell(r,c).fill={type:'pattern',pattern:'solid',fgColor:{argb:C.dark2}};
  r++;
  ws.getCell(r,1).value='Notes';ws.getCell(r,1).font={bold:true};
  profiles.forEach((p,i)=>ws.getCell(r,2+i).value=p?.sections?.[area]?.notes||'');
  thinGrid(ws,4,r,1,lastCol);
  ws.getColumn(1).width=34;
  for(let c=2;c<=lastCol;c++)ws.getColumn(c).width=24;
  ws.getRow(r).height=54;
  for(let c=2;c<=lastCol;c++)ws.getCell(r,c).alignment={wrapText:true,vertical:'top'};
}

function countFiles(snapshot){
  let n=0;
  Object.values(snapshot.areaFiles||{}).forEach(a=>{if(Array.isArray(a))n+=a.length});
  (snapshot.components||[]).forEach(c=>{if(Array.isArray(c.files))n+=c.files.length});
  return n;
}
function collectFiles(snapshot){
  const rows=[];
  for(const [area,list] of Object.entries(snapshot.areaFiles||{})){
    (Array.isArray(list)?list:[]).forEach(f=>rows.push({
      attachedTo:'Area',area,component:'',componentId:'',...f
    }));
  }
  (snapshot.components||[]).forEach(c=>{
    (Array.isArray(c.files)?c.files:[]).forEach(f=>rows.push({
      attachedTo:'Component',area:c.location||'',component:c.title||'',componentId:c.id||'',...f
    }));
  });
  return rows.sort((a,b)=>text(a.area).localeCompare(text(b.area))||text(a.component).localeCompare(text(b.component))||text(a.name).localeCompare(text(b.name)));
}
function buildFiles(wb,snapshot,used){
  const ws=wb.addWorksheet(sheetSafe('Files',used),{views:[{state:'frozen',ySplit:3}]});
  const headers=['Attached To','Area','Component','File Name','File Type','Size (bytes)','Added'];
  titleRow(ws,'Files','Index of photos and files attached in the Owner’s Manual',headers.length);
  ws.getRow(3).values=headers;styleHeader(ws.getRow(3));
  const files=collectFiles(snapshot);
  files.forEach((f,i)=>ws.getRow(4+i).values=[f.attachedTo,f.area,f.component,f.name||'',f.mime||'',Number(f.size)||0,f.createdAt||'']);
  thinGrid(ws,4,3+files.length,1,headers.length);
  addAutoFilter(ws,3,headers.length,Math.max(3,3+files.length));
  setWidths(ws,[15,18,30,38,24,16,24]);
}

function hide(ws){ws.state='veryHidden'}
function buildTechnical(wb,snapshot,used){
  const comp=wb.addWorksheet(sheetSafe('Component Data',used));
  comp.addRow(['id','title','location','system','type','manufacturer','partNumber','needsPurchase','source','phone','link','summary','specs','service','notes','rule','files_json','raw_json']);
  (snapshot.components||[]).forEach(c=>comp.addRow([
    c.id||'',c.title||'',c.location||'',c.system||'',c.type||'',c.manufacturer||'',c.partNumber||'',flag(c),
    c.source||'',c.phone||'',c.link||'',c.summary||'',c.specs||'',c.service||'',c.notes||'',c.rule||'',
    JSON.stringify(c.files||[]),JSON.stringify(c)
  ]));
  hide(comp);

  const setup=wb.addWorksheet(sheetSafe('Setup Data',used));
  setup.addRow(['profile_id','profile_name','active','area','field_order','field','value','section_notes']);
  (snapshot.profiles||[]).forEach(p=>{
    allAreas(snapshot).forEach(area=>{
      const section=p?.sections?.[area]||{values:{},notes:''};
      const fields=snapshot.schemas?.[area]||Object.keys(section.values||{});
      if(!fields.length)setup.addRow([p.id||'',p.name||'',p.id===snapshot.activeProfileId,area,'','','',section.notes||'']);
      fields.forEach((f,i)=>setup.addRow([p.id||'',p.name||'',p.id===snapshot.activeProfileId,area,i,f,section.values?.[f]??'',section.notes||'']));
    });
  });
  hide(setup);

  const profiles=wb.addWorksheet(sheetSafe('Profile Data',used));
  profiles.addRow(['profile_id','profile_name','active','raw_json']);
  (snapshot.profiles||[]).forEach(p=>profiles.addRow([p.id||'',p.name||'',p.id===snapshot.activeProfileId,JSON.stringify(p)]));
  hide(profiles);

  const fileData=wb.addWorksheet(sheetSafe('File Data',used));
  fileData.addRow(['scope','area','component_id','component','file_id','name','mime','size','created_at','storage_path','raw_json']);
  collectFiles(snapshot).forEach(f=>fileData.addRow([
    f.attachedTo==='Area'?'area':'component',f.area||'',f.componentId||'',f.component||'',f.id||'',f.name||'',f.mime||'',Number(f.size)||0,f.createdAt||'',f.path||'',JSON.stringify(f)
  ]));
  hide(fileData);

  const meta=wb.addWorksheet(sheetSafe('Metadata',used));
  meta.addRow(['key','value']);
  [
    ['export_format','abstraction-owner-manual-excel-v1'],
    ['app_export_version','v2026.10.07.36'],
    ['exported_at',new Date().toISOString()],
    ['active_profile_id',snapshot.activeProfileId||''],
    ['cloud_saved_at',snapshot.__cloudSavedAt||''],
    ['cloud_updated_at',window.__ABSTRACTION_CLOUD_UPDATED_AT||''],
    ['component_count',(snapshot.components||[]).length],
    ['profile_count',(snapshot.profiles||[]).length],
    ['schemas_json',JSON.stringify(snapshot.schemas||{})]
  ].forEach(x=>meta.addRow(x));
  hide(meta);

  const raw=wb.addWorksheet(sheetSafe('Raw State',used));
  raw.addRow(['chunk','json']);
  const json=JSON.stringify(snapshot);
  const size=30000;
  for(let i=0,n=1;i<json.length;i+=size,n++)raw.addRow([n,json.slice(i,i+size)]);
  hide(raw);
}

async function exportWorkbook(){
  if(exporting)return;
  exporting=true;
  const btn=byId('cloudExportExcel');
  const old=btn?.textContent||'Excel';
  if(btn){btn.disabled=true;btn.textContent='Building…'}
  try{
    if(typeof state==='undefined'||!state)throw new Error('Owner’s Manual data is not available.');
    const snapshot=clone(state); // critical: export never works on the live object
    const ExcelJS=await loadExcelJS();
    const wb=new ExcelJS.Workbook();
    wb.creator='Abstraction Owner\'s Manual';
    wb.company='Busch Performance';
    wb.subject='Racecar setup, component, purchase, and file data';
    wb.title='Abstraction Owner\'s Manual';
    wb.created=new Date();
    wb.modified=new Date();
    const used=new Set();

    buildOverview(wb,snapshot,used);
    buildPartsSheet(wb,snapshot,used,'Purchase List',true);
    buildPartsSheet(wb,snapshot,used,'Parts Index',false);
    buildProfiles(wb,snapshot,used);
    allAreas(snapshot).forEach(area=>buildSetupArea(wb,snapshot,used,area));
    buildFiles(wb,snapshot,used);
    buildTechnical(wb,snapshot,used);

    const buffer=await wb.xlsx.writeBuffer();
    const blob=new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=`${safeFilename(carName(snapshot))}-Owners-Manual-${excelDateStamp()}.xlsx`;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
    if(typeof toast==='function')toast('Excel workbook exported');
  }catch(e){
    console.error('Excel export',e);
    if(typeof toast==='function')toast('Excel export failed');
    else alert('Excel export failed: '+e.message);
  }finally{
    exporting=false;
    if(btn){btn.disabled=false;btn.textContent=old}
  }
}

function install(){
  const bottom=byId('cloudBottom');
  if(!bottom)return false;
  if(byId('cloudExportExcel'))return true;
  const b=document.createElement('button');
  b.type='button';b.className='btn';b.id='cloudExportExcel';b.textContent='Excel';
  b.title='Export all Owner\'s Manual data to an Excel workbook';
  const existing=byId('cloudExport');
  if(existing)existing.insertAdjacentElement('afterend',b); else bottom.appendChild(b);
  b.onclick=exportWorkbook;
  return true;
}

if(!install()){
  const obs=new MutationObserver(()=>{if(install())obs.disconnect()});
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>{if(install())obs.disconnect()},1500);
}
})();