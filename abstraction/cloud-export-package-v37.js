(() => {
'use strict';

/* Export Package - v2026.10.07.37
   READ ONLY. This module deep-clones Owner's Manual state, downloads copies of
   attached Storage objects, builds an Excel workbook, and packages everything
   into one ZIP. It never writes state, localStorage, Supabase rows, or Storage. */

const byId=id=>document.getElementById(id);
const SB_URL='https://gjlhegrcmaclikeoeonh.supabase.co';
const SB_KEY='sb_publishable_bh-dXv2tB7j-VH9qqTih6g_BAK5GCH9';
const BUCKET='owner-manual-files';
const EXCEL_LIB='https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
const ZIP_LIB='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
const AREA_ORDER=['General Setup','LF','RF','LR','RR','Front End','Engine','Cockpit','Rear End'];
let exporting=false;
let exportClient=null;

function clone(v){return JSON.parse(JSON.stringify(v))}
function flag(c){return c?.needsPurchase===true||c?.needsPurchase==='true'||c?.needsPurchase==='yes'}
function text(v){return v===null||v===undefined?'':String(v)}
function stamp(){
  const d=new Date(),p=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}
function safeFilename(s){
  return text(s||'Abstraction').replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,' ').trim()||'Abstraction';
}
function safePart(s){
  let v=text(s||'Item').replace(/[\\/:*?"<>|\x00-\x1F]+/g,'-').replace(/^\.+|\.+$/g,'').replace(/\s+/g,' ').trim();
  if(!v)v='Item';
  return v.slice(0,90);
}
function sheetSafe(name,used){
  let s=text(name).replace(/[\\/*?:\[\]]/g,' ').trim()||'Sheet';
  s=s.slice(0,31);
  const base=s;let n=2;
  while(used.has(s)){const suffix=' '+n++;s=base.slice(0,31-suffix.length)+suffix}
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
function activeProfile(snapshot){
  return (snapshot.profiles||[]).find(p=>p.id===snapshot.activeProfileId)||(snapshot.profiles||[])[0]||null;
}
function carName(snapshot){
  return activeProfile(snapshot)?.sections?.['General Setup']?.values?.Car||'Abstraction';
}
function loadScript(id,src,test){
  if(test())return Promise.resolve();
  return new Promise((resolve,reject)=>{
    let s=byId(id);
    if(s){
      s.addEventListener('load',()=>test()?resolve():reject(new Error('Library did not initialize.')),{once:true});
      s.addEventListener('error',()=>reject(new Error('Library failed to load.')),{once:true});
      return;
    }
    s=document.createElement('script');s.id=id;s.src=src;
    s.onload=()=>test()?resolve():reject(new Error('Library did not initialize.'));
    s.onerror=()=>reject(new Error('Library failed to load.'));
    document.head.appendChild(s);
  });
}
async function loadLibraries(){
  await loadScript('cloudExcelJsV37',EXCEL_LIB,()=>!!window.ExcelJS);
  await loadScript('cloudJsZipV37',ZIP_LIB,()=>!!window.JSZip);
}
function getClient(){
  if(!exportClient){
    if(!window.supabase?.createClient)throw new Error('Supabase client is unavailable.');
    exportClient=window.supabase.createClient(SB_URL,SB_KEY);
  }
  return exportClient;
}
async function getSession(){
  const {data,error}=await getClient().auth.getSession();
  if(error)throw error;
  if(!data?.session)throw new Error('Your login session has expired.');
  return data.session;
}
function extensionForPreview(item){
  const m=text(item.mime).toLowerCase(),n=text(item.name).toLowerCase();
  if(m.includes('png')||n.endsWith('.png'))return 'png';
  if(m.includes('jpeg')||m.includes('jpg')||/\.jpe?g$/i.test(n))return 'jpeg';
  if(m.includes('gif')||n.endsWith('.gif'))return 'gif';
  return '';
}
function toBase64(buffer){
  const bytes=new Uint8Array(buffer),chunk=0x8000;
  let binary='';
  for(let i=0;i<bytes.length;i+=chunk){
    binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+chunk,bytes.length)));
  }
  return btoa(binary);
}
function uniquePath(dir,name,used){
  const clean=safePart(name);
  const dot=clean.lastIndexOf('.');
  const stem=dot>0?clean.slice(0,dot):clean;
  const ext=dot>0?clean.slice(dot):'';
  let candidate=dir+'/'+clean,n=2;
  while(used.has(candidate.toLowerCase()))candidate=dir+'/'+stem+' ('+(n++)+')'+ext;
  used.add(candidate.toLowerCase());
  return candidate;
}
function collectAttachments(snapshot){
  const out=[],usedPaths=new Set(),componentFolders=new Map(),usedFolders=new Set();
  const components=(snapshot.components||[]).slice().sort((a,b)=>text(a.location).localeCompare(text(b.location))||text(a.title).localeCompare(text(b.title)));
  for(const c of components){
    let base='Attachments/Components/'+safePart(c.location||'Unassigned')+'/'+safePart(c.title||'Component');
    let folder=base,n=2;
    while(usedFolders.has(folder.toLowerCase()))folder=base+' ('+(n++)+')';
    usedFolders.add(folder.toLowerCase());
    componentFolders.set(c.id,folder);
  }
  for(const [area,list] of Object.entries(snapshot.areaFiles||{})){
    for(const f of (Array.isArray(list)?list:[])){
      const dir='Attachments/Areas/'+safePart(area);
      out.push({scope:'Area',area,component:'',componentId:'',...f,packagePath:uniquePath(dir,f.name||'file',usedPaths),status:'Pending',data:null,previewBase64:'',previewExt:''});
    }
  }
  for(const c of snapshot.components||[]){
    for(const f of (Array.isArray(c.files)?c.files:[])){
      const dir=componentFolders.get(c.id)||('Attachments/Components/'+safePart(c.location||'Unassigned')+'/'+safePart(c.title||'Component'));
      out.push({scope:'Component',area:c.location||'',component:c.title||'',componentId:c.id||'',...f,packagePath:uniquePath(dir,f.name||'file',usedPaths),status:'Pending',data:null,previewBase64:'',previewExt:''});
    }
  }
  return out.sort((a,b)=>text(a.area).localeCompare(text(b.area))||text(a.component).localeCompare(text(b.component))||text(a.name).localeCompare(text(b.name)));
}
async function downloadAttachments(entries,btn){
  const client=getClient();
  await getSession();
  let ok=0,failed=0;
  for(let i=0;i<entries.length;i++){
    const e=entries[i];
    if(btn)btn.textContent=`Files ${i+1}/${entries.length}`;
    try{
      if(!e.path)throw new Error('No storage path recorded.');
      const {data,error}=await client.storage.from(BUCKET).download(e.path);
      if(error)throw error;
      const buffer=await data.arrayBuffer();
      e.data=buffer;e.status='Included';ok++;
      const ext=extensionForPreview(e);
      if(ext&&buffer.byteLength<=20*1024*1024){
        e.previewExt=ext;
        e.previewBase64='data:image/'+(ext==='jpeg'?'jpeg':ext)+';base64,'+toBase64(buffer);
      }
    }catch(err){
      console.warn('Attachment export failed',e.path,err);
      e.status='Could not download';e.error=text(err?.message||err);failed++;
    }
  }
  return {ok,failed};
}

const C={
  dark:'161616',dark2:'242424',line:'C9C9C9',white:'FFFFFF',red:'A61B1B',redLight:'F7E7E7'
};
function titleRow(ws,title,subtitle,lastCol){
  ws.mergeCells(1,1,1,lastCol);
  const c=ws.getCell(1,1);c.value=title;c.font={bold:true,size:18,color:{argb:C.white}};
  c.fill={type:'pattern',pattern:'solid',fgColor:{argb:C.dark}};c.alignment={vertical:'middle'};ws.getRow(1).height=28;
  if(subtitle){
    ws.mergeCells(2,1,2,lastCol);
    const s=ws.getCell(2,1);s.value=subtitle;s.font={italic:true,size:10,color:{argb:'666666'}};ws.getRow(2).height=18;
  }
}
function styleHeader(row){
  row.font={bold:true,color:{argb:C.white}};row.fill={type:'pattern',pattern:'solid',fgColor:{argb:C.dark2}};
  row.alignment={vertical:'middle'};row.height=21;
  row.eachCell(c=>c.border={bottom:{style:'thin',color:{argb:C.line}}});
}
function thinGrid(ws,startRow,endRow,startCol,endCol){
  if(endRow<startRow)return;
  for(let r=startRow;r<=endRow;r++)for(let c=startCol;c<=endCol;c++){
    const cell=ws.getCell(r,c);cell.border={bottom:{style:'hair',color:{argb:'E1E1E1'}}};cell.alignment={vertical:'top',wrapText:true};
  }
}
function setWidths(ws,widths){widths.forEach((w,i)=>ws.getColumn(i+1).width=w)}
function addAutoFilter(ws,headerRow,colCount,lastRow){
  if(lastRow>=headerRow)ws.autoFilter={from:{row:headerRow,column:1},to:{row:lastRow,column:colCount}};
}
function addWebLink(cell,url,label){
  const u=text(url).trim();if(!u){cell.value='';return}
  cell.value={text:label||u,hyperlink:u};cell.font={color:{argb:'0563C1'},underline:true};
}
function addPackageLink(cell,path,label){
  if(!path){cell.value='';return}
  const target=encodeURI(path).replace(/#/g,'%23');
  cell.value={text:label||'Open file',hyperlink:target,tooltip:'Open exported attachment'};
  cell.font={color:{argb:'0563C1'},underline:true};
}
function countFiles(snapshot){
  let n=0;Object.values(snapshot.areaFiles||{}).forEach(a=>{if(Array.isArray(a))n+=a.length});
  (snapshot.components||[]).forEach(c=>{if(Array.isArray(c.files))n+=c.files.length});return n;
}
function buildOverview(wb,snapshot,used,entries){
  const ws=wb.addWorksheet(sheetSafe('Overview',used),{views:[{state:'frozen',ySplit:4}]});
  titleRow(ws,"Abstraction Owner's Manual",'Portable export package. Extract the ZIP before using attachment links.',6);
  ws.getRow(4).values=['Summary','Value','','Area','Components','Needs Purchase'];styleHeader(ws.getRow(4));
  const profiles=snapshot.profiles||[],components=snapshot.components||[],areas=allAreas(snapshot),ap=activeProfile(snapshot);
  const summary=[
    ['Car',carName(snapshot)],['Exported',new Date().toLocaleString()],['Active Setup Profile',ap?.name||''],
    ['Setup Profiles',profiles.length],['Components',components.length],['Needs Purchase',components.filter(flag).length],
    ['Attached Files',countFiles(snapshot)],['Files Included',entries.filter(x=>x.status==='Included').length],
    ['File Download Failures',entries.filter(x=>x.status!=='Included').length]
  ];
  summary.forEach((x,i)=>{ws.getCell(5+i,1).value=x[0];ws.getCell(5+i,2).value=x[1]});
  areas.forEach((a,i)=>{
    const list=components.filter(c=>c.location===a);
    ws.getCell(5+i,4).value=a==='General Setup'?'General':a;ws.getCell(5+i,5).value=list.length;ws.getCell(5+i,6).value=list.filter(flag).length;
  });
  ws.getColumn(1).font={bold:true};ws.getColumn(4).font={bold:true};
  thinGrid(ws,5,Math.max(13,4+areas.length),1,6);setWidths(ws,[24,30,4,20,14,16]);
}
function componentRow(c){
  return [text(c.title),text(c.location),text(c.system),text(c.manufacturer),text(c.partNumber),text(c.type),flag(c)?'YES':'NO',text(c.source),text(c.phone),text(c.link),text(c.summary),text(c.specs),text(c.service),text(c.notes),text(c.rule)];
}
function buildPartsSheet(wb,snapshot,used,name,onlyPurchase){
  const ws=wb.addWorksheet(sheetSafe(name,used),{views:[{state:'frozen',ySplit:3}]});
  const headers=['Component','Location','System','Manufacturer','Part #','Type','Needs Purchase','Vendor / Source','Phone','Purchase Link','Summary','Specifications','Service / Setup Notes','General Notes','Rule / Legality Notes'];
  titleRow(ws,name,onlyPurchase?'Components currently marked as needing purchase':'Complete component index',headers.length);
  ws.getRow(3).values=headers;styleHeader(ws.getRow(3));
  const items=(snapshot.components||[]).filter(c=>!onlyPurchase||flag(c)).slice().sort((a,b)=>text(a.title).localeCompare(text(b.title)));
  items.forEach((c,i)=>{
    const r=4+i;ws.getRow(r).values=componentRow(c);if(c.link)addWebLink(ws.getCell(r,10),c.link,'Open purchase/reference link');
    if(flag(c)){ws.getCell(r,7).fill={type:'pattern',pattern:'solid',fgColor:{argb:C.redLight}};ws.getCell(r,7).font={bold:true,color:{argb:C.red}}}
  });
  thinGrid(ws,4,3+items.length,1,headers.length);addAutoFilter(ws,3,headers.length,Math.max(3,3+items.length));
  setWidths(ws,[30,16,20,22,18,22,15,22,17,28,36,40,38,38,38]);
}
function buildProfiles(wb,snapshot,used){
  const ws=wb.addWorksheet(sheetSafe('Setup Profiles',used),{views:[{state:'frozen',ySplit:3}]});
  const headers=['Profile','Active','Car','Driver','Track','Date','Left %','Rear %','Total Weight','Profile ID'];
  titleRow(ws,'Setup Profiles','All saved setup profiles',headers.length);ws.getRow(3).values=headers;styleHeader(ws.getRow(3));
  (snapshot.profiles||[]).forEach((p,i)=>{
    const g=p?.sections?.['General Setup']?.values||{};
    ws.getRow(4+i).values=[p.name,p.id===snapshot.activeProfileId?'YES':'NO',g.Car||'',g.Driver||'',g.Track||'',g.Date||'',g['Left Percent']||'',g['Rear Percent']||'',g['Total Weight']||'',p.id||''];
  });
  thinGrid(ws,4,3+(snapshot.profiles||[]).length,1,headers.length);addAutoFilter(ws,3,headers.length,Math.max(3,3+(snapshot.profiles||[]).length));
  setWidths(ws,[28,10,18,20,22,16,12,12,16,26]);
}
function buildSetupArea(wb,snapshot,used,area){
  const profiles=snapshot.profiles||[],fields=(snapshot.schemas?.[area]||[]).slice(),display=area==='General Setup'?'General':area,lastCol=Math.max(2,1+profiles.length);
  const ws=wb.addWorksheet(sheetSafe(display,used),{views:[{state:'frozen',xSplit:1,ySplit:3}]});
  titleRow(ws,display+' Setup / Measurements','Rows are measurements; columns are setup profiles',lastCol);
  ws.getRow(3).values=['Measurement',...profiles.map(p=>p.name+(p.id===snapshot.activeProfileId?' (Active)':''))];styleHeader(ws.getRow(3));
  let r=4;
  if(!fields.length){ws.getCell(r++,1).value='No setup fields defined'}
  else fields.forEach(f=>{
    ws.getCell(r,1).value=f;ws.getCell(r,1).font={bold:true};profiles.forEach((p,i)=>ws.getCell(r,2+i).value=p?.sections?.[area]?.values?.[f]??'');r++;
  });
  r++;ws.getCell(r,1).value='SECTION NOTES';ws.getCell(r,1).font={bold:true,color:{argb:C.white}};
  for(let c=1;c<=lastCol;c++)ws.getCell(r,c).fill={type:'pattern',pattern:'solid',fgColor:{argb:C.dark2}};
  r++;ws.getCell(r,1).value='Notes';ws.getCell(r,1).font={bold:true};profiles.forEach((p,i)=>ws.getCell(r,2+i).value=p?.sections?.[area]?.notes||'');
  thinGrid(ws,4,r,1,lastCol);ws.getColumn(1).width=34;for(let c=2;c<=lastCol;c++)ws.getColumn(c).width=24;ws.getRow(r).height=54;
}
function buildFiles(wb,used,entries){
  const ws=wb.addWorksheet(sheetSafe('Files',used),{views:[{state:'frozen',ySplit:3}]});
  const headers=['Attached To','Area','Component','File Name','File Type','Size (bytes)','Added','Preview','Open File','Export Status'];
  titleRow(ws,'Files','Original files are stored in the Attachments folder inside this export package.',headers.length);
  ws.getRow(3).values=headers;styleHeader(ws.getRow(3));
  entries.forEach((f,i)=>{
    const r=4+i;ws.getRow(r).values=[f.scope,f.area,f.component,f.name||'',f.mime||'',Number(f.size)||0,f.createdAt||'','','',f.status];
    if(f.status==='Included')addPackageLink(ws.getCell(r,9),f.packagePath,'Open file');
    if(f.previewBase64&&f.previewExt){
      try{
        const imageId=wb.addImage({base64:f.previewBase64,extension:f.previewExt});
        ws.addImage(imageId,{tl:{col:7.05,row:r-0.95},ext:{width:108,height:68}});
        ws.getRow(r).height=56;
      }catch(e){console.warn('Preview embed failed',f.name,e)}
    }
    if(f.status!=='Included')ws.getCell(r,10).font={bold:true,color:{argb:C.red}};
  });
  thinGrid(ws,4,3+entries.length,1,headers.length);addAutoFilter(ws,3,headers.length,Math.max(3,3+entries.length));
  setWidths(ws,[14,18,28,34,22,15,22,18,14,20]);
}
function hide(ws){ws.state='veryHidden'}
function buildTechnical(wb,snapshot,used,entries){
  const comp=wb.addWorksheet(sheetSafe('Component Data',used));
  comp.addRow(['id','title','location','system','type','manufacturer','partNumber','needsPurchase','source','phone','link','summary','specs','service','notes','rule','files_json','raw_json']);
  (snapshot.components||[]).forEach(c=>comp.addRow([c.id||'',c.title||'',c.location||'',c.system||'',c.type||'',c.manufacturer||'',c.partNumber||'',flag(c),c.source||'',c.phone||'',c.link||'',c.summary||'',c.specs||'',c.service||'',c.notes||'',c.rule||'',JSON.stringify(c.files||[]),JSON.stringify(c)]));hide(comp);

  const setup=wb.addWorksheet(sheetSafe('Setup Data',used));setup.addRow(['profile_id','profile_name','active','area','field_order','field','value','section_notes']);
  (snapshot.profiles||[]).forEach(p=>allAreas(snapshot).forEach(area=>{
    const section=p?.sections?.[area]||{values:{},notes:''},fields=snapshot.schemas?.[area]||Object.keys(section.values||{});
    if(!fields.length)setup.addRow([p.id||'',p.name||'',p.id===snapshot.activeProfileId,area,'','','',section.notes||'']);
    fields.forEach((f,i)=>setup.addRow([p.id||'',p.name||'',p.id===snapshot.activeProfileId,area,i,f,section.values?.[f]??'',section.notes||'']));
  }));hide(setup);

  const profiles=wb.addWorksheet(sheetSafe('Profile Data',used));profiles.addRow(['profile_id','profile_name','active','raw_json']);
  (snapshot.profiles||[]).forEach(p=>profiles.addRow([p.id||'',p.name||'',p.id===snapshot.activeProfileId,JSON.stringify(p)]));hide(profiles);

  const fileData=wb.addWorksheet(sheetSafe('File Data',used));fileData.addRow(['scope','area','component_id','component','file_id','name','mime','size','created_at','storage_path','package_path','export_status','raw_json']);
  entries.forEach(f=>fileData.addRow([f.scope.toLowerCase(),f.area||'',f.componentId||'',f.component||'',f.id||'',f.name||'',f.mime||'',Number(f.size)||0,f.createdAt||'',f.path||'',f.packagePath||'',f.status||'',JSON.stringify({id:f.id,name:f.name,path:f.path,mime:f.mime,size:f.size,createdAt:f.createdAt})]));hide(fileData);

  const meta=wb.addWorksheet(sheetSafe('Metadata',used));meta.addRow(['key','value']);
  [
    ['export_format','abstraction-owner-manual-package-v1'],['app_export_version','v2026.10.07.37'],['exported_at',new Date().toISOString()],
    ['active_profile_id',snapshot.activeProfileId||''],['cloud_saved_at',snapshot.__cloudSavedAt||''],['cloud_updated_at',window.__ABSTRACTION_CLOUD_UPDATED_AT||''],
    ['component_count',(snapshot.components||[]).length],['profile_count',(snapshot.profiles||[]).length],['file_count',entries.length],
    ['schemas_json',JSON.stringify(snapshot.schemas||{})]
  ].forEach(x=>meta.addRow(x));hide(meta);

  const raw=wb.addWorksheet(sheetSafe('Raw State',used));raw.addRow(['chunk','json']);
  const json=JSON.stringify(snapshot),size=30000;for(let i=0,n=1;i<json.length;i+=size,n++)raw.addRow([n,json.slice(i,i+size)]);hide(raw);
}
async function buildWorkbook(snapshot,entries){
  const wb=new window.ExcelJS.Workbook();
  wb.creator="Abstraction Owner's Manual";wb.company='Busch Performance';wb.subject='Racecar setup, components, purchases, and attachment manifest';wb.title="Abstraction Owner's Manual";wb.created=new Date();wb.modified=new Date();
  const used=new Set();
  buildOverview(wb,snapshot,used,entries);buildPartsSheet(wb,snapshot,used,'Purchase List',true);buildPartsSheet(wb,snapshot,used,'Parts Index',false);buildProfiles(wb,snapshot,used);
  allAreas(snapshot).forEach(area=>buildSetupArea(wb,snapshot,used,area));buildFiles(wb,used,entries);buildTechnical(wb,snapshot,used,entries);
  return wb;
}
function readme(car,workbookName,entries){
  const failed=entries.filter(e=>e.status!=='Included');
  return [
    'ABSTRACTION OWNER\'S MANUAL EXPORT PACKAGE',
    '',
    'Car: '+car,
    'Exported: '+new Date().toLocaleString(),
    '',
    'CONTENTS',
    '- '+workbookName+' : formatted workbook plus hidden import/backup data sheets',
    '- Attachments/ : original copies of files and photos attached in Abstraction',
    '',
    'USING FILE LINKS',
    'Extract this ZIP to a folder before opening the Excel workbook. The Open File links',
    'in the Files sheet are relative links to the exported originals in Attachments/.',
    '',
    'IMAGE PREVIEWS',
    'JPEG, PNG, and GIF attachments are embedded as workbook previews when possible.',
    'The original image is also preserved in Attachments/. Other file types remain in',
    'their original format and are linked from the Files sheet.',
    '',
    'IMPORT COMPATIBILITY',
    'Do not rename or delete the hidden technical sheets if you want this package to be',
    'usable for a future Abstraction spreadsheet/package import feature.',
    '',
    'FILES REQUESTED: '+entries.length,
    'FILES INCLUDED: '+entries.filter(e=>e.status==='Included').length,
    'FILES NOT INCLUDED: '+failed.length,
    ...(failed.length?['','FILES THAT COULD NOT BE DOWNLOADED:',...failed.map(e=>'- '+(e.name||'file')+' ['+(e.path||'no path')+']')]:[])
  ].join('\r\n');
}
async function exportPackage(){
  if(exporting)return;exporting=true;
  const btn=byId('cloudExportPackage'),old=btn?.textContent||'Export Package';
  if(btn){btn.disabled=true;btn.textContent='Preparing…'}
  try{
    if(typeof state==='undefined'||!state)throw new Error("Owner's Manual data is unavailable.");
    const snapshot=clone(state);
    await loadLibraries();
    const entries=collectAttachments(snapshot);
    const result=await downloadAttachments(entries,btn);
    if(btn)btn.textContent='Building workbook…';
    const wb=await buildWorkbook(snapshot,entries);
    const workbookBuffer=await wb.xlsx.writeBuffer();
    const car=safeFilename(carName(snapshot)),date=stamp();
    const workbookName=car+'-Owners-Manual-'+date+'.xlsx';
    if(btn)btn.textContent='Packaging…';
    const zip=new window.JSZip();
    zip.file(workbookName,workbookBuffer);
    for(const e of entries)if(e.data)zip.file(e.packagePath,e.data,{binary:true,date:e.createdAt?new Date(e.createdAt):new Date()});
    zip.file('README.txt',readme(car,workbookName,entries));
    zip.file('manifest.json',JSON.stringify({
      format:'abstraction-owner-manual-package-v1',version:'v2026.10.07.37',exportedAt:new Date().toISOString(),
      workbook:workbookName,activeProfileId:snapshot.activeProfileId||'',
      attachments:entries.map(e=>({scope:e.scope,area:e.area,componentId:e.componentId,component:e.component,id:e.id||'',name:e.name||'',mime:e.mime||'',size:Number(e.size)||0,createdAt:e.createdAt||'',storagePath:e.path||'',packagePath:e.packagePath,status:e.status}))
    },null,2));
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:3}},m=>{if(btn&&m.percent)btn.textContent='Packaging '+Math.round(m.percent)+'%'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=car+'-Owners-Manual-Package-'+date+'.zip';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
    if(typeof toast==='function')toast(result.failed?('Package exported; '+result.failed+' file(s) could not be copied'):'Export package created');
  }catch(e){
    console.error('Export Package',e);
    if(typeof toast==='function')toast('Export package failed');
    else alert('Export package failed: '+e.message);
  }finally{
    exporting=false;if(btn){btn.disabled=false;btn.textContent=old}
  }
}
function install(){
  const bottom=byId('cloudBottom');if(!bottom)return false;if(byId('cloudExportPackage'))return true;
  const b=document.createElement('button');b.type='button';b.className='btn';b.id='cloudExportPackage';b.textContent='Export Package';b.title='Export workbook plus original attached files';
  const existing=byId('cloudExport');if(existing)existing.insertAdjacentElement('afterend',b);else bottom.appendChild(b);
  b.onclick=exportPackage;return true;
}
if(!install()){
  const obs=new MutationObserver(()=>{if(install())obs.disconnect()});obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>{if(install())obs.disconnect()},1500);
}
})();