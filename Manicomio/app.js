(function manicomioApp(){
"use strict";
const KEY="manicomio:archivio:v1";
const defaults={roles:["Sportello","OFE","Consulente finanziario","Consulente mobile","DUP"],categories:["Commerciale","Gestionale"],units:["n.","€","%","ore"]};
const catalogLabels={roles:"Ruoli dei collaboratori",categories:"Categorie degli obiettivi",units:"Unità di misura"};
function normalizeCatalog(data){
  if(!data.catalogs||typeof data.catalogs!=="object")data.catalogs={};
  for(const key of Object.keys(defaults)){
    if(!Array.isArray(data.catalogs[key]))data.catalogs[key]=[...defaults[key]];
    data.catalogs[key]=[...new Set(data.catalogs[key].filter(x=>typeof x==="string"&&x.trim()).map(x=>x.trim()))];
    if(!data.catalogs[key].length)data.catalogs[key]=[...defaults[key]];
  }
  for(const [key,items,field] of [["roles",data.people,"role"],["categories",data.goals,"category"],["units",data.goals,"unit"]]){
    for(const item of items||[])if(typeof item[field]==="string"&&item[field].trim()&&!data.catalogs[key].includes(item[field]))data.catalogs[key].push(item[field]);
  }
  if(!Array.isArray(data.reportImports))data.reportImports=[];
  data.version=4;
}
const pad=n=>String(n).padStart(2,"0");
const day=(d=new Date())=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const month=()=>day().slice(0,7);
const prevMonth=m=>{const [y,n]=m.split("-").map(Number);return `${n===1?y-1:y}-${pad(n===1?12:n-1)}`;};
const dateTitle=x=>new Date(x+"-01T12:00:00").toLocaleDateString("it-IT",{month:"long",year:"numeric"});
const shortDate=x=>x?x.split("-").reverse().join("/"):"";
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=n=>Number(n||0).toLocaleString("it-IT",{maximumFractionDigits:1});
const id=()=>((globalThis.crypto&&crypto.randomUUID)?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));
const blank=()=>({version:4,reportImports:[],offices:Array.from({length:13},(_,i)=>({id:"u"+i,name:i?"Ufficio di prossimità "+pad(i):"Ufficio principale"})),people:[],goals:[],entries:[],catalogs:{roles:[...defaults.roles],categories:[...defaults.categories],units:[...defaults.units]}});
let db;try{db=JSON.parse(localStorage.getItem(KEY));if(!db||!Array.isArray(db.offices)||!Array.isArray(db.people)||!Array.isArray(db.goals)||!Array.isArray(db.entries))db=blank();}catch{db=blank();}
normalizeCatalog(db);
let ui={page:"dashboard",month:month(),office:"all",date:day(),filter:"all",kpi:"",reportOffice:"",reportPreview:null};
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(db));return true;}catch{alert("Memoria del dispositivo piena: esporta subito un backup JSON.");return false;}};
const $=sel=>document.querySelector(sel);
const office=o=>db.offices.find(x=>x.id===o);
const person=p=>db.people.find(x=>x.id===p);
const scopeOf=g=>g?.scope==="office"?"office":"person";
const officeForGoal=g=>scopeOf(g)==="office"?g.officeId:person(g.personId)?.officeId;
const ownGoals=p=>db.goals.filter(g=>scopeOf(g)==="person"&&g.personId===p&&g.month===ui.month);
const officeGoals=o=>db.goals.filter(g=>g.month===ui.month&&scopeOf(g)==="office"&&g.officeId===o);
const goalLabel=g=>scopeOf(g)==="office"?"UFF · "+(office(g.officeId)?.name||"Ufficio"):(person(g.personId)?.name||"Collaboratore rimosso");
const goalLocation=g=>office(officeForGoal(g))?.name||"Ufficio non trovato";
const entryPerson=e=>e.personId?person(e.personId)?.name||"Collaboratore rimosso":scopeOf(db.goals.find(g=>g.id===e.goalId))==="office"?"Non attribuito":goalLabel(db.goals.find(g=>g.id===e.goalId));
const officeEntry=(g,d,pid)=>db.entries.find(e=>e.goalId===g.id&&e.date===d&&(e.personId||"")===(pid||""));
const kpiKey=g=>JSON.stringify([g.name.trim().toLocaleLowerCase("it"),g.category,g.unit,g.mode]);
const kpiOptions=()=>{const map=new Map();for(const g of db.goals.filter(g=>g.month===ui.month&&scopeOf(g)==="office"&&g.mode!=="latest")){const k=kpiKey(g);if(!map.has(k))map.set(k,{key:k,label:g.name+" · "+g.unit,name:g.name,unit:g.unit});}return [...map.values()].sort((a,b)=>a.label.localeCompare(b.label,"it"));};
const officeContribution=(g,pid)=>db.entries.filter(e=>e.goalId===g.id&&(e.personId||"")===(pid||"")&&e.date.startsWith(g.month)).reduce((a,e)=>a+Number(e.value||0),0);
const leaderData=(selected,filterOffice="all")=>{
 const gs=db.goals.filter(g=>g.month===ui.month&&scopeOf(g)==="office"&&kpiKey(g)===selected&&(filterOffice==="all"||g.officeId===filterOffice));
 const included=new Set(gs.map(g=>g.officeId));const members=db.people.filter(p=>included.has(p.officeId));
 const results=members.map(p=>({...p,result:gs.reduce((sum,g)=>sum+officeContribution(g,p.id),0)})).sort((a,b)=>b.result-a.result||a.name.localeCompare(b.name,"it"));
 return {gs,members:results,total:gs.reduce((a,g)=>a+val(g),0),target:gs.reduce((a,g)=>a+Number(g.target),0),unassigned:gs.reduce((a,g)=>a+officeContribution(g,""),0)};
};
const val=g=>{
 const ar=db.entries.filter(e=>e.goalId===g.id&&e.date.slice(0,7)===g.month).sort((a,b)=>a.date.localeCompare(b.date));
 return g.mode==="latest"?(ar.length?Number(ar[ar.length-1].value):0):ar.reduce((s,e)=>s+Number(e.value),0);
};
const pct=g=>g.target>0?val(g)*100/g.target:0;
const pretty=(g,x)=>g.unit==="€"?"€ "+fmt(x):fmt(x)+(g.unit==="n."?"":g.unit==="%"?"%":g.unit==="ore"?" h":" "+(g.unit||""));
const daysIn=m=>{const [y,n]=m.split("-").map(Number);return new Date(y,n,0).getDate();};
const expected=m=>{let cnt=0,elapsed=0;for(let n=1;n<=daysIn(m);n++){const d=new Date(m+"-"+pad(n)+"T12:00:00");if(d.getDay()===0)continue;cnt++;if(day(d)<=day())elapsed++;}return cnt?elapsed/cnt:0;};
const goalScore=gs=>gs.length?gs.reduce((s,g)=>s+Math.min(150,pct(g)),0)/gs.length:0;
const avgOffice=o=>goalScore(db.goals.filter(g=>g.month===ui.month&&officeForGoal(g)===o));
const pBar=(n)=>`<div class="bar"><span style="width:${Math.max(0,Math.min(100,n))}%"></span></div>`;
const selectOpts=(arr,selected)=>arr.map(x=>`<option value="${esc(x.id)}" ${x.id===selected?"selected":""}>${esc(x.name)}</option>`).join("");
const catalogOpts=(key,selected)=>db.catalogs[key].map(x=>`<option value="${esc(x)}" ${x===selected?"selected":""}>${esc(x)}</option>`).join("");
const roleOpts=selected=>catalogOpts("roles",selected);
const catalogValue=(value)=>String(value??"").trim().replace(/\s+/g," ");
const catalogDuplicate=(key,value,except)=>db.catalogs[key].some(x=>x!==except&&x.toLocaleLowerCase("it")===value.toLocaleLowerCase("it"));
const catalogUsage=(key,value)=>key==="roles"?db.people.filter(p=>p.role===value).length:db.goals.filter(g=>g[key==="categories"?"category":"unit"]===value).length;
function catalogAdd(key){
 if(!defaults[key])return;
 showModal("Aggiungi · "+catalogLabels[key],`<input type="hidden" name="catalogKey" value="${esc(key)}">${input("Nuova voce","name","","text",'maxlength="80"')}`,"catalog","");
}
function catalogRename(key,old){
 if(!defaults[key]||!db.catalogs[key].includes(old))return;
 showModal("Rinomina · "+catalogLabels[key],`<input type="hidden" name="catalogKey" value="${esc(key)}">${input("Nome voce","name",old,"text",'maxlength="80"')}`,"catalog",old);
}
function catalogQuickAdd(btn){
 const inline=btn.parentElement.querySelector(".catalog-add-inline");
 if(!inline)return;
 inline.hidden=!inline.hidden;
 if(!inline.hidden)inline.querySelector("input")?.focus();
}
function catalogQuickSave(btn){
 const inline=btn.closest(".catalog-add-inline");
 const key=inline?.dataset.cat, value=catalogValue(inline?.querySelector("input")?.value);
 if(!defaults[key]||!value||value.length>80){alert("Inserisci una voce da 1 a 80 caratteri.");return;}
 if(catalogDuplicate(key,value)){alert("Questa voce è già presente.");return;}
 db.catalogs[key].push(value);
 if(!save()){db.catalogs[key].pop();return;}
 const selector=inline.closest("form")?.elements.namedItem({roles:"role",categories:"category",units:"unit"}[key]);
 if(selector){const option=document.createElement("option");option.value=value;option.textContent=value;selector.add(option);selector.value=value;}
 inline.querySelector("input").value="";
 inline.hidden=true;
 toast("Nuova voce: "+value);
}
const quickCatalog=(key,label)=>`<div class="catalog-add-container"><button class="catalog-quick" type="button" data-action="catalogQuickAdd">+ ${esc(label)}</button><div class="catalog-add-inline" data-cat="${esc(key)}" hidden><input type="text" maxlength="80" placeholder="Nome nuova voce" aria-label="Nome nuova voce"><button class="secondary" type="button" data-action="catalogQuickSave">Aggiungi ✓</button></div></div>`;
function catalogRemove(key,value){
  const index=db.catalogs[key].indexOf(value);
  if(index<0)return;
  if(db.catalogs[key].length===1){alert("Deve restare almeno una voce in questa categoria.");return;}
  const count=catalogUsage(key,value);
  if(count){alert("Questa voce è utilizzata in "+count+" elementi. Modificala oppure assegna prima un'altra voce agli elementi collegati.");return;}
  if(!confirm("Eliminare la voce «"+value+"»?"))return;
  db.catalogs[key].splice(index,1);
  if(save()){render();toast("Voce eliminata");}
}
const icon=(name)=>({dashboard:"▦",offices:"▣",people:"♙",goals:"◎",ranking:"★",daily:"✎",reports:"▤",history:"◷",settings:"⚙"})[name]||"•";
const tabs=[["dashboard","Riepilogo"],["offices","Uffici"],["people","Collaboratori"],["goals","Obiettivi"],["ranking","Classifiche"],["daily","Registro"],["reports","Report"],["history","Storico"],["settings","Impostazioni"]];
function toast(t){const x=$("#toast");if(x){x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2600);}}
function change(page){ui.page=page;render();window.scrollTo(0,0);}
function footer(){return `<div class="foot">Manicomio • archivio locale su questo dispositivo • nessuna sincronizzazione cloud</div>`;}
function top(){return `<header class="top"><div><div class="eyebrow">GESTIONE DIREZIONALE • 13 UFFICI</div><h1>${esc(tabs.find(t=>t[0]===ui.page)?.[1]||"Manicomio")}</h1><p>${esc(dateTitle(ui.month))} · ${db.people.length} collaboratori censiti</p></div><label class="month"><span>Mese</span><input type="month" id="month" value="${esc(ui.month)}"></label></header>`;}
function nav(){return tabs.map(([p,t])=>`<button data-nav="${p}" class="${ui.page===p?"active":""}"><span>${icon(p)}</span><b>${t}</b></button>`).join("");}
function render(){document.title="Manicomio · Direzione";$("#app").innerHTML=`<div class="layout"><aside class="side"><div class="brand"><div class="brandmark">M</div><div><strong>Manicomio</strong><small>DIREZIONE RETE</small></div></div><div class="menulabel">LA TUA RETE</div><nav class="side-nav">${nav()}</nav><div class="side-bottom"><div class="side-feature">13 sedi, una sola regia.<br><span>Obiettivi commerciali e gestionali sempre sotto controllo.</span></div><span>Accesso locale · solo direttore</span></div></aside><main class="main">${top()}${page()}${footer()}</main></div><nav class="bottom-nav">${nav()}</nav>`;}
function page(){switch(ui.page){case"offices":return officesPage();case"people":return peoplePage();case"goals":return goalsPage();case"daily":return dailyPage();case"ranking":return rankingPage();case"reports":return reportsPage();case"history":return historyPage();case"settings":return settingsPage();default:return dashboardPage();}}
function dashboardPage(){
 const gs=db.goals.filter(g=>g.month===ui.month), q=expected(ui.month);
 const peopleWithGoals=new Set(gs.filter(g=>scopeOf(g)==="person").map(g=>g.personId)).size;
 const below=gs.filter(g=>pct(g)<q*100).length;
 const ofs=db.offices.map(o=>({o,score:avgOffice(o),count:db.people.filter(p=>p.officeId===o.id).length,goals:officeGoals(o.id).length}));
 const officeCount=gs.filter(g=>scopeOf(g)==="office").length;
 const kpis=kpiOptions(), selected=kpis.some(k=>k.key===ui.kpi)?ui.kpi:kpis[0]?.key;
 const rank=selected?leaderData(selected):null;
 return `<section class="hero"><div><div class="hero-tag">GEOPOSTALE • QUADRO MENSILE</div><h2>Ogni ufficio.<br><em>Ogni contributo conta.</em></h2><p>Obiettivi di sede, risultati individuali e confronto tra tutti i 13 uffici.</p><button class="primary" data-nav="daily">Apri registro giornaliero <span>→</span></button></div><div class="hero-number"><span>RETE</span><strong>${db.offices.length}</strong><small>uffici postali</small></div></section>
 <div class="stats"><div class="stat"><span>Uffici</span><strong>${db.offices.length}</strong><small>Sedi della rete</small></div><div class="stat"><span>Collaboratori</span><strong>${db.people.length}</strong><small>${peopleWithGoals} con obiettivi individuali</small></div><div class="stat"><span>Obiettivi ufficio</span><strong>${officeCount}</strong><small>${gs.length-officeCount} obiettivi individuali</small></div><div class="stat"><span>Obiettivi sotto ritmo</span><strong>${below}</strong><small>Atteso: ${Math.round(q*100)}% del mese</small></div></div>
 <div class="two-cols"><section class="panel"><div class="panel-head"><h3>Andamento per ufficio</h3><button class="link" data-nav="offices">Tutti gli uffici →</button></div>${ofs.map(({o,score,count,goals})=>`<button class="office-line" data-action="jumpOffice" data-id="${esc(o.id)}"><div><b>${esc(o.name)}</b><small>${count} collaboratori · ${goals} target di sede</small></div>${pBar(score)}<strong>${Math.round(score)}%</strong></button>`).join("")}</section>
 <section class="panel"><div class="panel-head"><h3>Contributi dei collaboratori</h3><button class="link" data-nav="ranking">Classifiche →</button></div>${!rank?`<div class="empty"><div>★</div><b>Assegna un obiettivo d'ufficio</b><p>Comparirà qui la classifica dei contributi registrati dai collaboratori.</p><button class="primary" data-action="goalOffice">+ Obiettivo ufficio</button></div>`:`<p class="subtle">${esc(kpis.find(k=>k.key===selected)?.label)}</p>${rank.members.slice(0,6).map((p,i)=>`<div class="attention"><div class="initials">${i+1}°</div><div><b>${esc(p.name)}</b><small>${esc(office(p.officeId)?.name)}</small></div><strong>${fmt(p.result)}</strong></div>`).join("")}<button class="text-button" data-nav="ranking">Apri classifica completa →</button>`}</section></div>`;
}
function officesPage(){return `<div class="section-title"><div><h2>La tua rete</h2><p>Rinomina i 13 uffici secondo la tua struttura.</p></div></div><div class="grid-cards">${db.offices.map((o,i)=>`<article class="tile"><div class="tile-top"><span class="office-num">${pad(i+1)}</span><button class="icon-button" data-action="editOffice" data-id="${esc(o.id)}" aria-label="Modifica ufficio">✎</button></div><h3>${esc(o.name)}</h3><p>${db.people.filter(p=>p.officeId===o.id).length} collaboratori · ${db.goals.filter(g=>g.month===ui.month&&officeForGoal(g)===o.id).length} obiettivi</p>${pBar(avgOffice(o))}<div class="tile-bottom"><span>Avanzamento medio</span><b>${Math.round(avgOffice(o))}%</b></div><button class="text-button" data-action="jumpOffice" data-id="${esc(o.id)}">Apri registro →</button> <button class="text-button" data-action="goalOffice" data-id="${esc(o.id)}">+ Obiettivo ufficio</button></article>`).join("")}</div>`;}
function peoplePage(){
const ps=db.people.filter(p=>ui.office==="all"||p.officeId===ui.office);
return `<div class="section-title"><div><h2>Collaboratori</h2><p>Sportello, OFE, DUP, consulenti finanziari, consulente mobile e ruoli personalizzati.</p></div><button class="primary" data-action="person">+ Aggiungi persona</button></div><div class="filters"><label>Filtra ufficio<select id="officeFilter"><option value="all">Tutti gli uffici</option>${selectOpts(db.offices,ui.office)}</select></label><button class="secondary" data-nav="settings">⚙ Gestisci ruoli</button></div>${!ps.length?`<div class="empty"><div>♙</div><b>Nessun collaboratore inserito</b><p>Aggiungi il primo collaboratore per assegnargli un obiettivo.</p></div>`:`<div class="grid-cards">${ps.map(p=>`<article class="tile person-tile"><div class="tile-top"><div class="initials large">${esc(p.name.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase())}</div><div><button class="icon-button" data-action="person" data-id="${esc(p.id)}" title="Modifica">✎</button><button class="icon-button" data-action="deletePerson" data-id="${esc(p.id)}" title="Elimina">×</button></div></div><h3>${esc(p.name)}</h3><p>${esc(p.role)}</p><span class="tag">${esc(office(p.officeId)?.name)}</span><div class="tile-bottom"><span>Obiettivi nel mese</span><b>${ownGoals(p.id).length}</b></div><button class="text-button" data-action="goal" data-person="${esc(p.id)}">+ Assegna obiettivo →</button></article>`).join("")}</div>`}`;}
function goalsPage(){
 const gs=db.goals.filter(g=>g.month===ui.month&&(ui.office==="all"||officeForGoal(g)===ui.office));
 const officeCount=gs.filter(g=>scopeOf(g)==="office").length;
 return `<div class="section-title"><div><h2>Obiettivi del mese</h2><p>Assegna target all'ufficio oppure al singolo collaboratore. I risultati di sede possono essere attribuiti alle persone.</p></div><div class="action-row"><button class="primary" data-action="goalOffice">+ Obiettivo ufficio</button><button class="secondary" data-action="goalPerson">+ Obiettivo persona</button></div></div>
 <div class="filters"><label>Ufficio<select id="officeFilter"><option value="all">Tutti gli uffici</option>${selectOpts(db.offices,ui.office)}</select></label><button class="secondary" data-action="copyGoals">Copia dal mese precedente</button><button class="secondary" data-nav="settings">⚙ Gestisci categorie</button></div>
 <p class="subtle" style="margin-bottom:12px">${officeCount} obiettivi di ufficio · ${gs.length-officeCount} obiettivi individuali</p>
 ${!gs.length?`<div class="empty"><div>◎</div><b>Nessun obiettivo per ${esc(dateTitle(ui.month))}</b><p>Puoi iniziare creando un target per uno dei 13 uffici, anche senza collaboratori.</p><button class="primary" data-action="goalOffice">Crea obiettivo ufficio</button></div>`:`<div class="goal-grid">${gs.map(g=>`<article class="goal-card"><div class="goal-head"><span class="tag ${scopeOf(g)==="office"?"light":""}">${scopeOf(g)==="office"?"Ufficio":"Individuale"} · ${esc(g.category)}</span><div><button class="icon-button" data-action="goal" data-id="${esc(g.id)}" title="Modifica">✎</button><button class="icon-button" data-action="deleteGoal" data-id="${esc(g.id)}" title="Elimina">×</button></div></div><h3>${esc(g.name)}</h3><p>${esc(goalLabel(g))}</p><div class="goal-numbers"><span><small>Raggiunto</small><strong>${pretty(g,val(g))}</strong></span><span><small>Target mensile</small><strong>${pretty(g,g.target)}</strong></span></div>${pBar(pct(g))}<div class="tile-bottom"><span>Avanzamento</span><b>${Math.round(pct(g))}%</b></div>${scopeOf(g)==="office"?`<button class="text-button" data-action="jumpOffice" data-id="${esc(g.officeId)}">Inserisci contributi →</button>`:""}</article>`).join("")}</div>`}
 `;
}
function dailyPage(){
 const oid=ui.office==="all"?db.offices[0]?.id:ui.office;
 if(!oid)return `<div class="empty">Nessun ufficio</div>`;
 const ps=db.people.filter(p=>p.officeId===oid);
 const date=ui.date.startsWith(ui.month)?ui.date:ui.month+"-01";
 const og=officeGoals(oid),sumOG=og.filter(g=>g.mode!=="latest");
 let total=0;
 const row=(g,pid)=>{
   const e=scopeOf(g)==="office"?officeEntry(g,date,pid):db.entries.find(x=>x.goalId===g.id&&x.date===date);
   total++;
   return `<label class="register-row"><span><b>${esc(g.name)} ${scopeOf(g)==="office"?"· UFFICIO":""}</b><small>${esc(g.category)} · totale mese ${pretty(g,val(g))} / ${pretty(g,g.target)}</small></span><div class="value-input"><input type="number" min="0" step="any" inputmode="decimal" name="entry_${esc(g.id)}_${esc(pid||"office")}" data-goal="${esc(g.id)}" data-person="${esc(pid||"")}" placeholder="—" ${e?`value="${esc(e.value)}"`:""}><i>${esc(g.unit)}</i></div></label>`;
 };
 const cards=ps.map(p=>{
    const gs=[...ownGoals(p.id),...sumOG];
    if(!gs.length)return "";
    return `<div class="register-person"><div class="register-header"><span class="initials">${esc(p.name.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase())}</span><div><b>${esc(p.name)}</b><small>${esc(p.role)} · obiettivi individuali e contributi di sede</small></div></div>${gs.map(g=>row(g,scopeOf(g)==="office"?p.id:"")).join("")}</div>`;
 }).filter(Boolean).join("");
 const officeRows=og.map(g=>row(g,"")).join("");
 return `<div class="section-title"><div><h2>Registro rapido</h2><p>Registra quanto ha prodotto ciascuna persona per gli obiettivi dell'ufficio, insieme ai suoi eventuali obiettivi individuali.</p></div></div>
 <form id="dailyForm"><div class="filters two"><label>Ufficio<select id="dailyOffice">${selectOpts(db.offices,oid)}</select></label><label>Giorno<input id="dailyDate" type="date" value="${esc(date)}"></label></div>
 <div class="info-line">I contributi personali alimentano automaticamente il totale dell'obiettivo di ufficio, senza duplicazioni. Scrivi <b>0</b> per registrare zero; lascia vuoto per non modificare.</div>
 ${!total?`<div class="empty"><div>✎</div><b>Nessun indicatore disponibile</b><p>Crea un obiettivo di ufficio o individuale per questo mese.</p><button type="button" class="primary" data-action="goalOffice">+ Obiettivo ufficio</button></div>`:
 cards+`<div class="register-person"><div class="register-header"><span class="initials">▣</span><div><b>Risultati riferiti solo all'ufficio</b><small>Da usare per valori non attribuiti a un singolo collaboratore. Per le percentuali viene registrato l'ultimo valore.</small></div></div>${officeRows}</div>`+
 `<div class="sticky-save"><div><b>${total} campi disponibili</b><small>${esc(office(oid)?.name)} · ${shortDate(date)}</small></div><button class="primary" type="submit">Salva giornata ✓</button></div>`}</form>`;
}
function historyPage(){
 const es=db.entries.filter(e=>{
   const g=db.goals.find(g=>g.id===e.goalId);
   return e.date.startsWith(ui.month)&&g&&(ui.office==="all"||officeForGoal(g)===ui.office);
 }).sort((a,b)=>b.date.localeCompare(a.date));
 return `<div class="section-title"><div><h2>Storico rilevazioni</h2><p>Ogni risultato indica l'ufficio e, quando disponibile, il collaboratore che ha contribuito.</p></div><button class="secondary" data-action="csvEntries">Esporta CSV ↓</button></div>
 <div class="filters"><label>Ufficio<select id="officeFilter"><option value="all">Tutti gli uffici</option>${selectOpts(db.offices,ui.office)}</select></label></div>
 ${!es.length?`<div class="empty">Nessuna rilevazione per questo mese.</div>`:`<div class="history-list">${es.map(e=>{
 const g=db.goals.find(g=>g.id===e.goalId);
 return `<div class="history-row"><div><b>${shortDate(e.date)}</b><small>${esc(entryPerson(e))} · ${esc(goalLocation(g))}</small><div>${esc(g.name)} · ${scopeOf(g)==="office"?"Ufficio":"Individuale"}</div></div><strong>${pretty(g,e.value)}</strong><button class="icon-button" title="Elimina rilevazione" data-action="deleteEntry" data-id="${esc(e.id)}">×</button></div>`;
 }).join("")}</div>`}`;
}
function rankingPage(){
 const opts=kpiOptions(),selected=opts.some(x=>x.key===ui.kpi)?ui.kpi:opts[0]?.key||"";
 const data=selected?leaderData(selected,ui.office):null;
 const choice=opts.find(x=>x.key===selected);
 return `<div class="section-title"><div><h2>Classifiche GeoPostale</h2><p>Confronta i contributi dei collaboratori per uno stesso indicatore e verifica i risultati dei singoli uffici.</p></div><button class="secondary" data-action="csvContributions">Esporta classifica CSV ↓</button></div>
 ${!opts.length?`<div class="empty"><div>★</div><b>Nessun indicatore di ufficio disponibile</b><p>Assegna almeno un obiettivo a un ufficio e registra i contributi per costruire le classifiche.</p><button class="primary" data-action="goalOffice">+ Nuovo obiettivo di ufficio</button></div>`:
 `<div class="filters two"><label>Indicatore<select id="kpiFilter">${opts.map(o=>`<option value="${esc(o.key)}" ${o.key===selected?"selected":""}>${esc(o.label)}</option>`).join("")}</select></label><label>Ambito<select id="officeFilter"><option value="all">Tutto il GeoPostale</option>${selectOpts(db.offices,ui.office)}</select></label></div>
 <div class="stats"><div class="stat"><span>Target aggregato</span><strong>${fmt(data.target)}</strong><small>${esc(choice.unit)}</small></div><div class="stat"><span>Totale raggiunto</span><strong>${fmt(data.total)}</strong><small>${Math.round(data.target?data.total/data.target*100:0)}% del target</small></div><div class="stat"><span>Contributi attribuiti</span><strong>${fmt(data.members.reduce((s,p)=>s+p.result,0))}</strong><small>${data.members.length} collaboratori</small></div><div class="stat"><span>Non attribuiti</span><strong>${fmt(data.unassigned)}</strong><small>Inserimenti riferiti solo all'ufficio</small></div></div>
 <div class="two-cols"><section class="panel"><div class="panel-head"><h3>Classifica collaboratori</h3><span class="subtle">${esc(choice.name)}</span></div>
 ${!data.members.length?`<div class="empty">Aggiungi collaboratori agli uffici per vedere la classifica.</div>`:data.members.map((p,i)=>`<div class="leader-row"><span class="leader-num">${i+1}</span><div class="leader-name"><b>${esc(p.name)}</b><small>${esc(office(p.officeId)?.name)} · ${esc(p.role)}</small></div><div class="leader-score"><strong>${fmt(p.result)}</strong><small>${esc(choice.unit)}</small></div></div>`).join("")}
 </section><section class="panel"><div class="panel-head"><h3>Uffici a confronto</h3><span class="subtle">Stesso indicatore</span></div>
 ${data.gs.slice().sort((a,b)=>pct(b)-pct(a)).map(g=>`<button class="office-line" data-action="jumpOffice" data-id="${esc(g.officeId)}"><div><b>${esc(goalLocation(g))}</b><small>${pretty(g,val(g))} / ${pretty(g,g.target)}</small></div>${pBar(pct(g))}<strong>${Math.round(pct(g))}%</strong></button>`).join("")}</section></div>
 <p class="note">Le classifiche confrontano soltanto lo stesso indicatore (nome, categoria, unità e modalità di calcolo). Le cifre di natura diversa non vengono sommate. I collaboratori senza risultati compaiono con zero. Le prestazioni vanno lette alla luce di presenze, incarichi e opportunità effettive.</p>`}`;
}
const REPORT_HEADERS=["Versione","Codice ufficio","Ufficio","Data","Codice obiettivo","Ambito","Obiettivo","Categoria","Unità","Target mensile","Codice collaboratore","Collaboratore","Risultato","Note"];
const REPORT_VERSION="MANICOMIO-REPORT-2";
function reportOffice(){return db.offices.find(o=>o.id===ui.reportOffice)||(ui.office!=="all"?office(ui.office):null)||db.offices[0];}

function reportDate(d){const [y,m,dd]=d.split("-");return dd+"/"+m+"/"+y;}

function reportDateParse(x){
 const s=String(x||"").trim();
 if(/^\d{4}-\d{2}-\d{2}$/.test(s)){const dt=new Date(s+"T12:00:00");return Number.isFinite(dt.getTime())&&dt.toISOString().slice(0,10)===s?s:null;}
 if(/^\d{1,2}[./-]\d{1,2}[./-]\d{4}$/.test(s)){
  const [dd,mm,yy]=s.split(/[./-]/).map(Number),t=`${yy}-${pad(mm)}-${pad(dd)}`;
  const dt=new Date(t+"T12:00:00");
  return Number.isFinite(dt.getTime())&&dt.toISOString().slice(0,10)===t?t:null;
 }
 return null;
}

function csvSafeCell(x){
 let s=String(x??"");
 if(/^[\s]*[=+@]/.test(s))s="'"+s;
 return '"'+s.replaceAll('"','""')+'"';
}

function reportCsv(rows){return "\uFEFFsep=;\r\n"+rows.map(row=>row.map(csvSafeCell).join(";")).join("\r\n")+"\r\n";}

function csvParse(source){
 const src=String(source||"").replace(/^\uFEFF/,"").replace(/^sep=;\r?\n/i,"");
 let rows=[],row=[],field="",quoted=false;
 for(let i=0;i<src.length;i++){
  const ch=src[i];
  if(quoted){if(ch==='"'&&src[i+1]==='"'){field+='"';i++;}else if(ch==='"')quoted=false;else field+=ch;}
  else if(ch==='"'&&field==="")quoted=true;
  else if(ch===';'){row.push(field);field="";}
  else if(ch==='\r'||ch==='\n'){
   if(ch==='\r'&&src[i+1]==='\n')i++;
   row.push(field);field="";
   if(row.some(x=>x.trim()))rows.push(row);
   row=[];
  }else field+=ch;
 }
 if(quoted)throw Error("Virgolette CSV non chiuse.");
 if(field!==""||row.length){row.push(field);if(row.some(x=>x.trim()))rows.push(row);}
 return rows;
}

function reportGoals(oid){
 return db.goals.filter(g=>g.month===ui.month&&officeForGoal(g)===oid).sort((a,b)=>{
  const a0=scopeOf(a)==="office"?0:1,b0=scopeOf(b)==="office"?0:1;
  return a0-b0||a.name.localeCompare(b.name,"it");
 });
}

function numberParse(x){
 const s=String(x).trim().replace(/\s/g,"");
 if(!s)return null;
 if(!/^\d+(?:[.,]\d+)?$/.test(s))return NaN;
 return Number(s.replace(",","."));
}

function generateReport(which){
 const o=reportOffice();if(!o)return;
 const gs=reportGoals(o.id);
 if(!gs.length){alert("Non ci sono obiettivi per "+o.name+" nel mese "+dateTitle(ui.month)+". Assegna prima almeno un obiettivo.");return;}
 const days=which==="day"?[ui.date.slice(0,7)===ui.month?ui.date:ui.month+"-01"]:Array.from({length:daysIn(ui.month)},(_,i)=>ui.month+"-"+pad(i+1));
 const people=db.people.filter(p=>p.officeId===o.id).sort((a,b)=>a.name.localeCompare(b.name,"it"));
 const rows=[REPORT_HEADERS];
 for(const d of days)for(const g of gs){
  const members=scopeOf(g)==="person"?[person(g.personId)]:g.mode==="latest"?[null]:[...people,null];
  for(const p of members){
   if(scopeOf(g)==="person"&&!p)continue;
   const pid=scopeOf(g)==="office"?p?.id||"":g.personId;
   const e=db.entries.find(e=>e.goalId===g.id&&e.date===d&&(scopeOf(g)==="person"||(e.personId||"")===pid));
   rows.push([REPORT_VERSION,o.id,o.name,reportDate(d),g.id,scopeOf(g)==="office"?"Ufficio":"Individuale",g.name,g.category,g.unit,String(Number(g.target)).replace(".",","),pid,p?.name||(scopeOf(g)==="office"?"Non attribuito":""),e?String(Number(e.value)).replace(".",","):"",e?.note||""]);
  }
 }
 const name=o.name.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9_-]+/g,"_").slice(0,36)||"Ufficio";
 download(`Manicomio_Report_${name}_${which==="day"?ui.date:ui.month}.csv`,reportCsv(rows),"text/csv;charset=utf-8");
 toast(rows.length-1+" righe esportate per "+o.name);
}
function buildReportPreview(textContent,fileName){
 const all=csvParse(textContent);
 if(all.length<2)throw Error("Il file è vuoto oppure non contiene risultati.");
 const hdr=all[0].map(s=>s.trim().toLowerCase());
 if(REPORT_HEADERS.some((h,i)=>hdr[i]!==h.toLowerCase()))throw Error("Colonne non riconosciute. Scarica un report dall'app e non modificare i titoli delle colonne.");
 const records=[],errs=[],seen=new Set(),officeSet=new Set(),monthSet=new Set();
 let blank=0,equal=0,newCount=0,changed=0;
 for(let i=1;i<all.length;i++){
  const row=all[i],line=i+1;
  if(row.length!==REPORT_HEADERS.length){errs.push(`Riga ${line}: numero di colonne errato (${row.length}).`);continue;}
  const [version,oid,officeName,dateRaw,gid,scope,name,category,unit,targetRaw,pid,personName,resultRaw,noteRaw]=row;
  if(!String(resultRaw).trim()){blank++;continue;}
  if(version!==REPORT_VERSION){errs.push(`Riga ${line}: versione report non valida.`);continue;}
  const o=office(oid),g=db.goals.find(g=>g.id===gid),dt=reportDateParse(dateRaw);
  const value=numberParse(resultRaw);
  if(!o||!g||!dt||!Number.isFinite(value)||value<0){errs.push(`Riga ${line}: codice ufficio, codice obiettivo, data o risultato non valido.`);continue;}
  if(officeForGoal(g)!==oid||dt.slice(0,7)!==g.month){errs.push(`Riga ${line}: obiettivo non associato a questa sede o al mese del risultato.`);continue;}
  if(scopeOf(g)!==(scope==="Ufficio"?"office":"person")||g.unit!==unit||numberParse(targetRaw)!==Number(g.target)){errs.push(`Riga ${line}: ambito, unità o target mensile modificati.`);continue;}
  if(scopeOf(g)==="person"&&g.personId!==pid){errs.push(`Riga ${line}: codice collaboratore non associato all'obiettivo individuale.`);continue;}
  if(scopeOf(g)==="office"&&pid&&(g.mode==="latest"||!person(pid)||person(pid).officeId!==oid)){errs.push(`Riga ${line}: collaboratore non valido per questo ufficio.`);continue;}
  if(officeName!==o.name||name!==g.name||category!==g.category||(pid&&person(pid)?.name!==personName)){errs.push(`Riga ${line}: descrizioni non corrispondenti ai codici attuali. Genera un report aggiornato.`);continue;}
  const key=[gid,dt,scopeOf(g)==="office"?pid:""].join("|");
  if(seen.has(key)){errs.push(`Riga ${line}: risultato duplicato nello stesso file (stesso giorno, obiettivo e collaboratore).`);continue;}
  seen.add(key);officeSet.add(oid);monthSet.add(dt.slice(0,7));
  const old=db.entries.find(e=>e.goalId===gid&&e.date===dt&&(scopeOf(g)==="person"||(e.personId||"")===pid));
  const note=String(noteRaw||"").slice(0,500);
  const status=old?(Number(old.value)===value&&(old.note||"")===note?"uguale":"aggiornato"):"nuovo";
  if(status==="nuovo")newCount++;if(status==="aggiornato")changed++;if(status==="uguale")equal++;
  records.push({id:old?.id||id(),goalId:gid,date:dt,personId:scopeOf(g)==="office"?pid:"",value,note,status,display:`${reportDate(dt)} · ${o.name} · ${g.name} · ${pid?person(pid)?.name:"Non attribuito"}: ${String(value).replace(".",",")}`});
 }
 if(officeSet.size>1||monthSet.size>1)errs.push("Un report può contenere dati di un solo ufficio e di un solo mese.");
 const sourceOffice=officeSet.size===1?office([...officeSet][0]):null;
 return {filename:fileName,records,errors:errs,blank,newCount,changed,equal,officeId:sourceOffice?.id||"",officeName:sourceOffice?.name||"",month:monthSet.size===1?[...monthSet][0]:""};
}

function reportImportPreview(v){
 if(!v)return "";
 const valid=v.errors.length===0&&v.records.length>0&&(v.newCount+v.changed)>0;
 return `<section class="panel report-preview">
  <div class="panel-head"><h3>Anteprima importazione</h3><button class="secondary" data-action="reportClear">Annulla</button></div>
  <p><b>${esc(v.filename)}</b> · ${esc(v.officeName||"Ufficio non riconosciuto")} · ${esc(v.month)}</p>
  <div class="report-summary"><span><b>${v.newCount}</b> nuovi</span><span><b>${v.changed}</b> correzioni</span><span><b>${v.equal}</b> già presenti</span><span><b>${v.blank}</b> vuoti</span><span><b>${v.errors.length}</b> errori</span></div>
  ${v.errors.length?`<div class="alert"><b>Importazione bloccata: verifica il file.</b><div class="report-errors">${v.errors.slice(0,12).map(x=>`<p>${esc(x)}</p>`).join("")}${v.errors.length>12?`<p>… e altri ${v.errors.length-12} errori.</p>`:""}</div></div>`:""}
  <div class="report-preview-lines">${v.records.filter(x=>x.status!=="uguale").slice(0,8).map(x=>`<div>${esc(x.display)} <b>${x.status==="nuovo"?"Nuovo":"Correzione"}</b></div>`).join("")}</div>
  ${v.records.length===0?`<p>Nessun valore compilato: inserisci almeno un risultato nel file.</p>`:""}
  ${!v.errors.length&&v.records.length&&!(v.newCount+v.changed)?`<p>Non ci sono differenze da importare: i risultati sono già registrati.</p>`:""}
  <button class="primary" data-action="reportCommit" ${valid?"":"disabled"}>Conferma importazione (${v.newCount+v.changed} risultati)</button>
 </section>`;
}

function reportsPage(){
 const o=reportOffice(),gs=o?reportGoals(o.id):[];
 const last=(db.reportImports||[]).slice(-10).reverse();
 return `<div class="section-title"><div><h2>Report per ufficio</h2><p>Genera i modelli da consegnare ai direttori, poi importa i CSV compilati nella dashboard GeoPostale.</p></div></div>
 <section class="panel report-builder"><div class="panel-head"><h3>1. Prepara il report da consegnare</h3><span class="tag">Compatibile con Excel</span></div>
 <div class="filters two"><label>Ufficio<select id="reportOffice">${selectOpts(db.offices,o?.id)}</select></label><label>Giornata di riferimento<input type="date" id="reportDate" value="${esc(ui.date.slice(0,7)===ui.month?ui.date:ui.month+"-01")}"></label></div>
 <p class="subtle">${gs.length} obiettivi configurati per ${esc(o?.name||"")}. Il modello contiene collaboratori, obiettivi e codici di riconoscimento.</p>
 <div class="action-row" style="margin-top:15px"><button class="primary" data-action="reportDaily" ${gs.length?"":"disabled"}>↓ Modello giornaliero CSV</button><button class="secondary" data-action="reportMonthly" ${gs.length?"":"disabled"}>↓ Modello mensile CSV</button></div>
 ${!gs.length?`<div class="info-line">Assegna prima almeno un obiettivo di ufficio o individuale, quindi torna qui per generare il report.</div>`:""}</section>
 <section class="panel report-builder"><div class="panel-head"><h3>2. Importa il file ricevuto</h3><span class="tag light">Controllo prima del salvataggio</span></div>
 <p class="subtle">Il direttore compila soltanto <b>Risultato</b> e, facoltativamente, <b>Note</b>. Le colonne di identificazione non devono essere modificate. Il formato richiesto è CSV con separatore punto e virgola.</p>
 <label class="file report-upload"><input id="reportUpload" type="file" accept=".csv,text/csv,text/plain"> Seleziona il report compilato (.csv)</label>
 <p class="note">Puoi consegnare il modello tramite un canale aziendale autorizzato. Carica qui i report ricevuti: se importi nuovamente lo stesso valore, non viene sommato due volte.</p></section>
 ${reportImportPreview(ui.reportPreview)}
 <section class="panel report-builder"><div class="panel-head"><h3>Ultimi report importati</h3><span class="subtle">Archivio locale</span></div>
 ${!last.length?`<div class="empty"><b>Non hai ancora importato report.</b><p>Qui compariranno ufficio, mese e data dell'importazione.</p></div>`:last.map(x=>`<div class="report-log"><div><b>${esc(office(x.officeId)?.name||"Ufficio")}</b><small>${esc(x.month)} · ${esc(x.filename)} · ${esc(new Date(x.at).toLocaleString("it-IT"))}</small></div><span>${x.created} nuovi · ${x.updated} corretti</span></div>`).join("")}</section>
 <section class="panel"><h3>Indicazioni per i direttori</h3><p class="note">1. Aprire il CSV in Excel. 2. Compilare solo <b>Risultato</b> e, se necessario, <b>Note</b>. 3. Lasciare vuote le righe senza dati; digitare 0 se il risultato è zero. 4. Salvare in formato CSV UTF-8, con separatore punto e virgola, e restituire il file. Non modificare i codici né i nomi degli obiettivi.</p></section>`;
}

function commitReport(){
 const v=ui.reportPreview;
 if(!v||v.errors.length||!(v.newCount+v.changed)||!v.officeId)return;
 if(!confirm(`Confermi ${v.newCount} nuovi risultati e ${v.changed} correzioni per ${v.officeName} (${v.month})?`))return;
 for(const r of v.records){
  if(r.status==="uguale")continue;
  const g=db.goals.find(g=>g.id===r.goalId);
  const idx=db.entries.findIndex(e=>e.goalId===r.goalId&&e.date===r.date&&(scopeOf(g)==="person"||(e.personId||"")===r.personId));
  const updated={id:idx<0?r.id:db.entries[idx].id,goalId:r.goalId,date:r.date,personId:r.personId,value:r.value,note:r.note};
  if(idx<0)db.entries.push(updated);else db.entries[idx]=updated;
 }
 if(!Array.isArray(db.reportImports))db.reportImports=[];
 db.reportImports.push({id:id(),officeId:v.officeId,month:v.month,filename:v.filename,at:new Date().toISOString(),created:v.newCount,updated:v.changed});
 if(db.reportImports.length>200)db.reportImports=db.reportImports.slice(-200);
 if(save()){const n=v.newCount+v.changed;ui.reportPreview=null;render();toast(n+" risultati acquisiti. Classifiche aggiornate.");}
}
function catalogSection(){
  const list=(key)=>`<div class="catalog-group"><div class="catalog-group-top"><div><h3>${esc(catalogLabels[key])}</h3><p>${key==="roles"?"Modifica i ruoli disponibili nelle schede dei collaboratori.":key==="categories"?"Personalizza le categorie associate agli obiettivi.":"Aggiungi o modifica le unità usate nei target."}</p></div><button type="button" class="secondary" data-action="catalogAdd" data-cat="${key}">+ Aggiungi</button></div><div class="catalog-items">${db.catalogs[key].map(value=>`<div class="catalog-row"><span><b>${esc(value)}</b><small>${catalogUsage(key,value)} ${key==="roles"?"collaboratori":"obiettivi"} collegati</small></span><div class="catalog-actions"><button class="icon-button" type="button" title="Rinomina voce" aria-label="Rinomina ${esc(value)}" data-action="catalogRename" data-cat="${key}" data-value="${esc(value)}">✎</button><button class="icon-button" type="button" title="Elimina voce" aria-label="Elimina ${esc(value)}" data-action="catalogRemove" data-cat="${key}" data-value="${esc(value)}">×</button></div></div>`).join("")}</div></div>`;
  return `<div class="catalog-management"><div><h2>Personalizza le categorie</h2><p>Aggiungi, rinomina o elimina le voci dei menu senza perdere le assegnazioni. Le rinomine si applicano automaticamente anche ai dati esistenti.</p></div>${["roles","categories","units"].map(list).join("")}</div>`;
}
function settingsPage(){return `<div class="section-title"><div><h2>Impostazioni e categorie</h2><p>Personalizza i menu e gestisci gli archivi sul dispositivo.</p></div></div><section class="panel settings-stack">${catalogSection()}<div class="alert"><b>Attenzione: archivio locale, senza login.</b><p>Il sito è pubblico ma i dati inseriti restano in questo browser, non vengono caricati su GitHub. Non inserire dati personali di dipendenti o informazioni aziendali riservate senza autorizzazione, adeguate misure di sicurezza e verifica privacy.</p></div><div><h3>Esportazione e backup</h3><p>Effettua regolarmente un backup JSON e conservalo in modo sicuro: cancellando i dati del browser perderesti i risultati.</p><div class="action-row"><button class="secondary" data-action="backup">Backup JSON ↓</button><button class="secondary" data-action="csvGoals">Obiettivi CSV ↓</button><button class="secondary" data-action="csvEntries">Rilevazioni CSV ↓</button></div></div><div><h3>Ripristina archivio</h3><p>Importa un backup JSON creato da Manicomio, sostituendo i dati locali esistenti.</p><label class="file"><input type="file" accept=".json,application/json" id="importFile"> Seleziona file JSON</label></div><div><h3>Gestione dei mesi</h3><button class="secondary" data-action="copyGoals">Copia i target dal mese precedente</button></div><div><h3>Installa sul telefono</h3><p><b>iPhone:</b> apri l'indirizzo in Safari → Condividi → Aggiungi alla schermata Home. <b>Android:</b> usa la voce Installa app nel menu di Chrome. Dopo il primo accesso l'app può funzionare anche offline.</p></div><div class="danger"><h3>Azzeramento</h3><p>Elimina uffici personalizzati, collaboratori, obiettivi e rilevazioni dal dispositivo.</p><button class="danger-btn" data-action="reset">Svuota archivio</button></div></section>`;}
function showModal(title,body,kind,record,submit="Salva"){let root=$("#dialog");root.innerHTML=`<div class="shade" data-action="dismiss"><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-head"><h2>${esc(title)}</h2><button class="icon-button" type="button" data-action="dismiss">✕</button></div><form id="editForm" data-kind="${esc(kind)}" data-id="${esc(record||"")}"><div class="modal-body">${body}</div><div class="modal-footer"><button type="button" class="secondary" data-action="dismiss">Annulla</button><button type="submit" class="primary">${esc(submit)}</button></div></form></div></div>`;}
function closeModal(){$("#dialog").innerHTML="";}
function input(label,name,val="",type="text",extra=""){return `<label class="field">${esc(label)}<input name="${esc(name)}" type="${esc(type)}" value="${esc(val)}" ${extra} required></label>`;}
function modOffice(id0){const o=office(id0);showModal("Rinomina ufficio",input("Nome ufficio","name",o?.name,"text",'maxlength="80"'),"office",id0);}
function modPerson(pid){const p=person(pid);showModal(p?"Modifica collaboratore":"Nuovo collaboratore",`${input("Nome e cognome","name",p?.name,"text",'maxlength="100"')}<label class="field">Ufficio<select name="officeId" required>${selectOpts(db.offices,p?.officeId||db.offices[0]?.id)}</select></label><label class="field">Ruolo<select name="role" required>${roleOpts(p?.role||"Sportello")}</select>${quickCatalog("roles","Nuovo ruolo (es. DUP)")}</label>`,"person",pid);}
function modGoal(gid,preselect,preferredScope,preferredOffice){
 const g=db.goals.find(x=>x.id===gid), locked=!!g&&db.entries.some(e=>e.goalId===g.id);
 const scope=g?scopeOf(g):(preferredScope||((preselect||db.people.length)?"person":"office"));
 if(scope==="person"&&!db.people.length){toast("Inserisci prima un collaboratore, oppure crea un obiettivo d'ufficio");change("people");return;}
 const p=g?.personId||preselect||db.people[0]?.id;
 const oid=g?.officeId||preferredOffice||(ui.office!=="all"?ui.office:db.offices[0].id);
 const peopleOpts=db.people.map(x=>({id:x.id,name:x.name+" · "+(office(x.officeId)?.name||"")}));
 const body=`<label class="field">Ambito dell'obiettivo<select id="goalScope" name="scope" ${locked?"disabled":""}><option value="office" ${scope==="office"?"selected":""}>Intero ufficio postale</option><option value="person" ${scope==="person"?"selected":""}>Singolo collaboratore</option></select></label>${locked?`<input type="hidden" name="scope" value="${esc(scope)}"><div class="info-line">L'ambito non può cambiare dopo la registrazione dei risultati. Puoi modificare nome, target e categoria.</div>`:""}
 <div class="field" id="officeGoalTarget" ${scope!=="office"?'style="display:none"':""}><label>Ufficio di riferimento<select name="officeId" ${scope==="office"?"required":""}>${selectOpts(db.offices,oid)}</select></label></div>
 <div class="field" id="personGoalTarget" ${scope!=="person"?'style="display:none"':""}><label>Collaboratore<select name="personId" ${scope==="person"?"required":""}>${selectOpts(peopleOpts,p)}</select></label></div>
 ${input("Nome indicatore","name",g?.name||"","text",'maxlength="100"')}
 <div class="form-grid"><label class="field">Categoria<select name="category">${catalogOpts("categories",g?.category||db.catalogs.categories[0])}</select>${quickCatalog("categories","Nuova categoria")}</label><label class="field">Unità<select name="unit">${catalogOpts("units",g?.unit||db.catalogs.units[0])}</select>${quickCatalog("units","Nuova unità")}</label></div>
 ${input("Target mensile","target",g?.target??"","number",'min="0.000001" step="any"')}
 <label class="field">Tipo di misurazione<select name="mode" id="goalMode"><option value="sum" ${g?.mode!=="latest"?"selected":""}>Somma dei risultati giornalieri</option><option value="latest" ${g?.mode==="latest"?"selected":""}>Ultimo valore registrato (es. percentuale)</option></select></label>
 <div class="info-line">Gli obiettivi d'ufficio di tipo <b>Somma</b> permettono di registrare i contributi di ogni collaboratore. I target <b>Ultimo valore</b> sono compilati soltanto come dato di ufficio.</div>`;
 showModal(g?"Modifica obiettivo":"Nuovo obiettivo",body,"goal",gid);
}

function download(name,content,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
function csv(rows){return "\uFEFF"+rows.map(r=>r.map(x=>`"${String(x??"").replaceAll('"','""')}"`).join(";")).join("\r\n");}
function backup(){download("Manicomio_backup_"+day()+".json",JSON.stringify(db,null,2),"application/json");}
function csvGoals(){
 const rows=[["Mese","Ambito","Ufficio","Collaboratore","Ruolo","Obiettivo","Categoria","Target","Unità","Consuntivo","Avanzamento %"]];
 db.goals.filter(g=>g.month===ui.month).forEach(g=>{
   const p=scopeOf(g)==="person"?person(g.personId):null;
   rows.push([g.month,scopeOf(g)==="office"?"Ufficio":"Individuale",goalLocation(g),p?.name||"",p?.role||"",g.name,g.category,g.target,g.unit,val(g),Math.round(pct(g))]);
 });
 download("Manicomio_obiettivi_"+ui.month+".csv",csv(rows),"text/csv;charset=utf-8");
}
function csvEntries(){
 const rows=[["Data","Ambito","Ufficio","Collaboratore / Contributore","Ruolo","Obiettivo","Categoria","Valore","Unità"]];
 db.entries.filter(e=>e.date.startsWith(ui.month)).forEach(e=>{
   const g=db.goals.find(g=>g.id===e.goalId);
   if(!g)return;
   const p=scopeOf(g)==="office"?person(e.personId):person(g.personId);
   rows.push([e.date,scopeOf(g)==="office"?"Ufficio":"Individuale",goalLocation(g),p?.name||"Non attribuito",p?.role||"",g.name,g.category,e.value,g.unit]);
 });
 download("Manicomio_rilevazioni_"+ui.month+".csv",csv(rows),"text/csv;charset=utf-8");
}
function csvContributions(){
 const opts=kpiOptions(), selected=opts.some(o=>o.key===ui.kpi)?ui.kpi:opts[0]?.key;
 if(!selected){toast("Crea prima un obiettivo di ufficio di tipo Somma");return;}
 const data=leaderData(selected,ui.office),label=opts.find(x=>x.key===selected)?.name||"Indicatore";
 const rows=[["Posizione","Mese","Indicatore","Ufficio","Collaboratore","Ruolo","Contributo","Unità"]];
 data.members.forEach((p,i)=>rows.push([i+1,ui.month,label,office(p.officeId)?.name,p.name,p.role,p.result,opts.find(x=>x.key===selected)?.unit||""]));
 download("Manicomio_classifica_"+ui.month+".csv",csv(rows),"text/csv;charset=utf-8");
}
document.addEventListener("click",e=>{const nav=e.target.closest("[data-nav]");if(nav){ui.page=nav.dataset.nav;if(ui.page==="daily"&&ui.office==="all")ui.office=db.offices[0].id;render();window.scrollTo(0,0);return;}
const b=e.target.closest("[data-action]");if(!b)return;const action=b.dataset.action;const k=b.dataset.id;
if(action==="dismiss"){if(b.classList.contains("shade")&&e.target!==b)return;closeModal();return;}
if(action==="catalogQuickAdd")catalogQuickAdd(b);
if(action==="catalogQuickSave")catalogQuickSave(b);
if(action==="catalogAdd")catalogAdd(b.dataset.cat);
if(action==="catalogRename")catalogRename(b.dataset.cat,b.dataset.value);
if(action==="catalogRemove")catalogRemove(b.dataset.cat,b.dataset.value);
if(action==="editOffice")modOffice(k);
if(action==="person")modPerson(k);
if(action==="goal")modGoal(k,b.dataset.person);
if(action==="goalPerson")modGoal(null,null,"person");
if(action==="goalOffice")modGoal(null,null,"office",k);
if(action==="jumpOffice"){ui.office=k;ui.page="daily";render();window.scrollTo(0,0);}
if(action==="deletePerson"){const p=person(k);if(p&&db.entries.some(e=>e.personId===k)){alert("Questo collaboratore ha contribuito a obiettivi di ufficio: per mantenere lo storico non può essere eliminato. Puoi spostarlo o rinominarlo.");return;}if(p&&confirm("Eliminare "+p.name+" e tutti i suoi obiettivi e risultati?")){const gids=new Set(db.goals.filter(g=>g.personId===k).map(g=>g.id));db.entries=db.entries.filter(x=>!gids.has(x.goalId));db.goals=db.goals.filter(g=>g.personId!==k);db.people=db.people.filter(x=>x.id!==k);save();render();}}
if(action==="deleteGoal"){const g=db.goals.find(x=>x.id===k);if(g&&confirm("Eliminare l'obiettivo «"+g.name+"» e tutti i suoi risultati?")){db.goals=db.goals.filter(x=>x.id!==k);db.entries=db.entries.filter(x=>x.goalId!==k);save();render();}}
if(action==="deleteEntry"){if(confirm("Eliminare questa rilevazione?")){db.entries=db.entries.filter(x=>x.id!==k);save();render();}}
if(action==="backup")backup();
if(action==="csvGoals")csvGoals();
if(action==="csvEntries")csvEntries();
if(action==="csvContributions")csvContributions();
if(action==="reportDaily")generateReport("day");
if(action==="reportMonthly")generateReport("month");
if(action==="reportClear"){ui.reportPreview=null;render();}
if(action==="reportCommit")commitReport();
if(action==="reset"){if(confirm("ATTENZIONE: svuotare tutto l'archivio locale? Assicurati di aver esportato un backup.")&&confirm("Confermi la cancellazione definitiva?")){db=blank();save();ui.office="all";change("dashboard");}}
if(action==="copyGoals"){const pm=prevMonth(ui.month),src=db.goals.filter(g=>g.month===pm),keyOf=g=>[scopeOf(g),scopeOf(g)==="office"?g.officeId:g.personId,g.name.toLocaleLowerCase("it"),g.category].join("|"),existing=new Set(db.goals.filter(g=>g.month===ui.month).map(keyOf));let n=0;for(const g of src){const key=keyOf(g);if(existing.has(key))continue;db.goals.push({...g,id:id(),month:ui.month});existing.add(key);n++;}save();render();toast(n?n+" obiettivi copiati":"Nessun nuovo obiettivo da copiare");}
});
document.addEventListener("change",async e=>{
const t=e.target;
if(t.id==="month"){ui.month=t.value;ui.date=ui.month+"-01";ui.kpi="";ui.reportPreview=null;render();return;}
if(t.id==="reportOffice"){ui.reportOffice=t.value;ui.reportPreview=null;render();return;}
if(t.id==="reportDate"){if(!t.value.startsWith(ui.month)){alert("La data deve appartenere al mese selezionato.");render();return;}ui.date=t.value;return;}
if(t.id==="reportUpload"&&t.files?.[0]){
 try{
  if(t.files[0].size>5*1024*1024)throw Error("Il file supera il limite di 5 MB.");
  ui.reportPreview=buildReportPreview(await t.files[0].text(),t.files[0].name);render();toast("Report controllato: verifica anteprima");
 }catch(err){ui.reportPreview=null;render();alert("Lettura report non riuscita: "+err.message);}
 return;
}
if(t.id==="kpiFilter"){ui.kpi=t.value;render();return;}
if(t.id==="goalScope"){const scope=t.value;for(const [which,show] of [["office",scope==="office"],["person",scope==="person"]]){const el=document.getElementById(which==="office"?"officeGoalTarget":"personGoalTarget");if(el){el.style.display=show?"":"none";const sel=el.querySelector("select");if(sel)sel.required=show;}}return;}
if(t.id==="officeFilter"){ui.office=t.value;render();return;}
if(t.id==="dailyOffice"){ui.office=t.value;render();return;}
if(t.id==="dailyDate"){if(t.value.slice(0,7)!==ui.month){alert("Scegli una data del mese selezionato in alto.");render();return;}ui.date=t.value;render();return;}
if(t.id==="importFile"&&t.files?.[0]){try{const raw=JSON.parse(await t.files[0].text());if(!raw||!Array.isArray(raw.offices)||!Array.isArray(raw.people)||!Array.isArray(raw.goals)||!Array.isArray(raw.entries)||raw.offices.length<1)throw Error("Il file non è un backup valido.");if(confirm("Importare il backup? Sostituirà tutti i dati locali presenti.")){normalizeCatalog(raw);db=raw;save();ui.office="all";change("dashboard");toast("Backup importato");}}catch(err){alert("Importazione non riuscita: "+err.message);}}
});
document.addEventListener("submit",e=>{
e.preventDefault();const form=e.target;
if(form.id==="dailyForm"){
 const d=ui.date.startsWith(ui.month)?ui.date:ui.month+"-01";let n=0;
 form.querySelectorAll("[data-goal]").forEach(el=>{
  if(el.value.trim()==="")return;
  const v=Number(el.value),g=db.goals.find(g=>g.id===el.dataset.goal);
  if(!g||!Number.isFinite(v)||v<0)return;
  const pid=scopeOf(g)==="office"?el.dataset.person||"":"";
  let old=db.entries.find(e=>e.goalId===g.id&&e.date===d&&(scopeOf(g)!=="office"||(e.personId||"")===pid));
  if(old)old.value=v;
  else db.entries.push({id:id(),date:d,goalId:g.id,personId:pid,value:v});
  n++;
 });
 if(n){save();render();toast(n+" valori salvati per il "+shortDate(d));}
 else toast("Nessun valore da salvare");
 return;
}
if(form.id==="editForm"){const x=Object.fromEntries(new FormData(form));const kind=form.dataset.kind,rec=form.dataset.id;
if(kind==="office"){let o=office(rec);if(o)o.name=String(x.name||"").trim();}
if(kind==="person"){if(!x.name?.trim())return;let p=person(rec);if(p)Object.assign(p,{name:x.name.trim(),role:x.role,officeId:x.officeId});else db.people.push({id:id(),name:x.name.trim(),role:x.role,officeId:x.officeId});}
if(kind==="goal"){
 const scope=x.scope==="office"?"office":"person",target=Number(x.target),g=db.goals.find(g=>g.id===rec);
 if(scope==="person"&&!person(x.personId)){alert("Seleziona un collaboratore valido.");return;}
 if(scope==="office"&&!office(x.officeId)){alert("Seleziona un ufficio valido.");return;}
 if(!x.name?.trim()||!Number.isFinite(target)||target<=0){alert("Inserisci nome e target maggiore di zero.");return;}
 if(g&&db.entries.some(e=>e.goalId===g.id)&&(scopeOf(g)!==scope||(scope==="office"&&g.officeId!==x.officeId)||(scope==="person"&&g.personId!==x.personId)||(g.mode!==x.mode))){alert("Con risultati già registrati non puoi cambiare ambito, destinatario o modalità di calcolo.");return;}
 const obj={scope,personId:scope==="person"?x.personId:null,officeId:scope==="office"?x.officeId:null,month:ui.month,name:x.name.trim(),category:x.category,target,unit:x.unit,mode:x.mode};
 if(g)Object.assign(g,obj);else db.goals.push({id:id(),...obj});
}
if(kind==="catalog"){
 const key=x.catalogKey,value=catalogValue(x.name),old=rec;
 if(!defaults[key]||!value||value.length>80){alert("Inserisci una voce valida da 1 a 80 caratteri.");return;}
 if(catalogDuplicate(key,value,old)){alert("Esiste già una voce con questo nome.");return;}
 if(old){
  const pos=db.catalogs[key].indexOf(old);if(pos<0)return;
  db.catalogs[key][pos]=value;
  if(key==="roles")for(const p of db.people)if(p.role===old)p.role=value;
  if(key==="categories")for(const g of db.goals)if(g.category===old)g.category=value;
  if(key==="units")for(const g of db.goals)if(g.unit===old)g.unit=value;
 }else db.catalogs[key].push(value);
}
if(save()){closeModal();render();toast("Salvato correttamente");}
}
});
save();render();
if("serviceWorker" in navigator&&location.protocol==="https:")navigator.serviceWorker.register("./sw.js").catch(()=>{});
})();