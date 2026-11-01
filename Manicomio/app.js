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
  data.version=2;
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
const blank=()=>({version:2,offices:Array.from({length:13},(_,i)=>({id:"u"+i,name:i?"Ufficio di prossimità "+pad(i):"Ufficio principale"})),people:[],goals:[],entries:[],catalogs:{roles:[...defaults.roles],categories:[...defaults.categories],units:[...defaults.units]}});
let db;try{db=JSON.parse(localStorage.getItem(KEY));if(!db||!Array.isArray(db.offices)||!Array.isArray(db.people)||!Array.isArray(db.goals)||!Array.isArray(db.entries))db=blank();}catch{db=blank();}
normalizeCatalog(db);
let ui={page:"dashboard",month:month(),office:"all",date:day(),filter:"all"};
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(db));return true;}catch{alert("Memoria del dispositivo piena: esporta subito un backup JSON.");return false;}};
const $=sel=>document.querySelector(sel);
const office=o=>db.offices.find(x=>x.id===o);
const person=p=>db.people.find(x=>x.id===p);
const ownGoals=p=>db.goals.filter(g=>g.personId===p&&g.month===ui.month);
const val=g=>{let ar=db.entries.filter(e=>e.goalId===g.id&&e.date.slice(0,7)===g.month).sort((a,b)=>a.date.localeCompare(b.date));return g.mode==="latest"?(ar.length?ar[ar.length-1].value:0):ar.reduce((s,e)=>s+Number(e.value),0);};
const pct=g=>g.target>0?val(g)*100/g.target:0;
const pretty=(g,x)=>g.unit==="€"?"€ "+fmt(x):fmt(x)+(g.unit==="n."?"":g.unit==="%"?"%":g.unit==="ore"?" h":" "+(g.unit||""));
const daysIn=m=>{const [y,n]=m.split("-").map(Number);return new Date(y,n,0).getDate();};
const expected=m=>{let cnt=0,elapsed=0;for(let n=1;n<=daysIn(m);n++){const d=new Date(m+"-"+pad(n)+"T12:00:00");if(d.getDay()===0)continue;cnt++;if(day(d)<=day())elapsed++;}return cnt?elapsed/cnt:0;};
const goalScore=gs=>gs.length?gs.reduce((s,g)=>s+Math.min(150,pct(g)),0)/gs.length:0;
const avgOffice=o=>goalScore(db.goals.filter(g=>g.month===ui.month&&person(g.personId)?.officeId===o));
const pBar=(n)=>`<div class="bar"><span style="width:${Math.max(0,Math.min(100,n))}%"></span></div>`;
const selectOpts=(arr,selected)=>arr.map(x=>`<option value="${esc(x.id)}" ${x.id===selected?"selected":""}>${esc(x.name)}</option>`).join("");
const catalogOpts=(key,selected)=>db.catalogs[key].map(x=>`<option value="${esc(x)}" ${x===selected?"selected":""}>${esc(x)}</option>`).join("");
const roleOpts=selected=>catalogOpts("roles",selected);
const catalogValue=(value)=>String(value??"").trim().replace(/\s+/g," ");
const catalogDuplicate=(key,value,except)=>db.catalogs[key].some(x=>x!==except&&x.toLocaleLowerCase("it")===value.toLocaleLowerCase("it"));
const catalogUsage=(key,value)=>key==="roles"?db.people.filter(p=>p.role===value).length:db.goals.filter(g=>g[key==="categories"?"category":"unit"]===value).length;
function catalogAdd(key,select){
  if(!defaults[key])return;
  const entered=prompt("Nuova voce per "+catalogLabels[key]+":");
  if(entered===null)return;
  const value=catalogValue(entered);
  if(!value||value.length>80){alert("Inserisci una voce da 1 a 80 caratteri.");return;}
  if(catalogDuplicate(key,value)){alert("Questa voce è già presente.");return;}
  db.catalogs[key].push(value);
  if(!save()){db.catalogs[key].pop();return;}
  if(select){const option=document.createElement("option");option.value=value;option.textContent=value;select.add(option);select.value=value;}
  else render();
  toast("Voce aggiunta: "+value);
}
function catalogRename(key,old){
  const entered=prompt("Modifica voce:",old);
  if(entered===null)return;
  const value=catalogValue(entered);
  if(!value||value.length>80){alert("Inserisci una voce da 1 a 80 caratteri.");return;}
  if(value===old)return;
  if(catalogDuplicate(key,value,old)){alert("Questa voce è già presente.");return;}
  const index=db.catalogs[key].indexOf(old);if(index<0)return;
  db.catalogs[key][index]=value;
  if(key==="roles")for(const p of db.people)if(p.role===old)p.role=value;
  if(key==="categories")for(const g of db.goals)if(g.category===old)g.category=value;
  if(key==="units")for(const g of db.goals)if(g.unit===old)g.unit=value;
  if(save()){render();toast("Voce modificata e dati aggiornati");}
}
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
const icon=(name)=>({dashboard:"▦",offices:"▣",people:"♙",goals:"◎",daily:"✎",history:"◷",settings:"⚙"})[name]||"•";
const tabs=[["dashboard","Riepilogo"],["offices","Uffici"],["people","Collaboratori"],["goals","Obiettivi"],["daily","Registro"],["history","Storico"],["settings","Impostazioni"]];
function toast(t){const x=$("#toast");if(x){x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2600);}}
function change(page){ui.page=page;render();window.scrollTo(0,0);}
function footer(){return `<div class="foot">Manicomio • archivio locale su questo dispositivo • nessuna sincronizzazione cloud</div>`;}
function top(){return `<header class="top"><div><div class="eyebrow">GESTIONE DIREZIONALE • 13 UFFICI</div><h1>${esc(tabs.find(t=>t[0]===ui.page)?.[1]||"Manicomio")}</h1><p>${esc(dateTitle(ui.month))} · ${db.people.length} collaboratori censiti</p></div><label class="month"><span>Mese</span><input type="month" id="month" value="${esc(ui.month)}"></label></header>`;}
function nav(){return tabs.map(([p,t])=>`<button data-nav="${p}" class="${ui.page===p?"active":""}"><span>${icon(p)}</span><b>${t}</b></button>`).join("");}
function render(){document.title="Manicomio · Direzione";$("#app").innerHTML=`<div class="layout"><aside class="side"><div class="brand"><div class="brandmark">M</div><div><strong>Manicomio</strong><small>DIREZIONE RETE</small></div></div><div class="menulabel">LA TUA RETE</div><nav class="side-nav">${nav()}</nav><div class="side-bottom"><div class="side-feature">13 sedi, una sola regia.<br><span>Obiettivi commerciali e gestionali sempre sotto controllo.</span></div><span>Accesso locale · solo direttore</span></div></aside><main class="main">${top()}${page()}${footer()}</main></div><nav class="bottom-nav">${nav()}</nav>`;}
function page(){switch(ui.page){case"offices":return officesPage();case"people":return peoplePage();case"goals":return goalsPage();case"daily":return dailyPage();case"history":return historyPage();case"settings":return settingsPage();default:return dashboardPage();}}
function dashboardPage(){
const gs=db.goals.filter(g=>g.month===ui.month);
const q=expected(ui.month);
const peopleWithGoals=[...new Set(gs.map(g=>g.personId))].length;
const below=gs.filter(g=>pct(g)<q*100).length;
const ofs=db.offices.map(o=>({o,score:avgOffice(o),count:db.people.filter(p=>p.officeId===o.id).length}));
return `<section class="hero"><div><div class="hero-tag">IL QUADRO DEL MESE</div><h2>Ogni ufficio.<br><em>Un obiettivo chiaro.</em></h2><p>Controlla l'intera rete e registra i risultati quotidiani, senza perdere di vista nessuno.</p><button class="primary" data-nav="daily">Apri registro giornaliero <span>→</span></button></div><div class="hero-number"><span>RETE</span><strong>13</strong><small>uffici postali</small></div></section>
<div class="stats"><div class="stat"><span>Uffici</span><strong>${db.offices.length}</strong><small>Sedi della rete</small></div><div class="stat"><span>Collaboratori</span><strong>${db.people.length}</strong><small>Persone inserite</small></div><div class="stat"><span>Obiettivi assegnati</span><strong>${gs.length}</strong><small>${peopleWithGoals} persone coinvolte</small></div><div class="stat"><span>Obiettivi sotto ritmo</span><strong>${below}</strong><small>Atteso: ${Math.round(q*100)}% del mese</small></div></div>
<div class="two-cols"><section class="panel"><div class="panel-head"><h3>Andamento per ufficio</h3><button class="link" data-nav="offices">Tutti gli uffici →</button></div>${ofs.map(({o,score,count})=>`<button class="office-line" data-action="jumpOffice" data-id="${esc(o.id)}"><div><b>${esc(o.name)}</b><small>${count} collaboratori</small></div>${pBar(score)}<strong>${Math.round(score)}%</strong></button>`).join("")}</section><section class="panel"><div class="panel-head"><h3>Da tenere d'occhio</h3><span class="subtle">Rispetto al ritmo atteso</span></div>${!gs.length?`<div class="empty"><div>◎</div><b>Inizia assegnando gli obiettivi</b><p>Configura i collaboratori e poi i target del mese.</p><button class="primary" data-nav="people">Aggiungi collaboratori</button></div>`:gs.sort((a,b)=>pct(a)-pct(b)).slice(0,8).map(g=>`<div class="attention"><div class="initials">${esc((person(g.personId)?.name||"?").slice(0,2).toUpperCase())}</div><div><b>${esc(person(g.personId)?.name)}</b><small>${esc(g.name)} · ${esc(office(person(g.personId)?.officeId)?.name)}</small></div><strong>${Math.round(pct(g))}%</strong></div>`).join("")}<p class="note">Il ritmo atteso considera lunedì–sabato, senza festività e assenze. Personalizzabile nelle versioni successive.</p></section></div>`;
}
function officesPage(){return `<div class="section-title"><div><h2>La tua rete</h2><p>Rinomina i 13 uffici secondo la tua struttura.</p></div></div><div class="grid-cards">${db.offices.map((o,i)=>`<article class="tile"><div class="tile-top"><span class="office-num">${pad(i+1)}</span><button class="icon-button" data-action="editOffice" data-id="${esc(o.id)}" aria-label="Modifica ufficio">✎</button></div><h3>${esc(o.name)}</h3><p>${db.people.filter(p=>p.officeId===o.id).length} collaboratori · ${db.goals.filter(g=>g.month===ui.month&&person(g.personId)?.officeId===o.id).length} obiettivi</p>${pBar(avgOffice(o))}<div class="tile-bottom"><span>Avanzamento medio</span><b>${Math.round(avgOffice(o))}%</b></div><button class="text-button" data-action="jumpOffice" data-id="${esc(o.id)}">Apri registro →</button></article>`).join("")}</div>`;}
function peoplePage(){
const ps=db.people.filter(p=>ui.office==="all"||p.officeId===ui.office);
return `<div class="section-title"><div><h2>Collaboratori</h2><p>Sportello, OFE, DUP, consulenti finanziari, consulente mobile e ruoli personalizzati.</p></div><button class="primary" data-action="person">+ Aggiungi persona</button></div><div class="filters"><label>Filtra ufficio<select id="officeFilter"><option value="all">Tutti gli uffici</option>${selectOpts(db.offices,ui.office)}</select></label><button class="secondary" data-nav="settings">⚙ Gestisci ruoli</button></div>${!ps.length?`<div class="empty"><div>♙</div><b>Nessun collaboratore inserito</b><p>Aggiungi il primo collaboratore per assegnargli un obiettivo.</p></div>`:`<div class="grid-cards">${ps.map(p=>`<article class="tile person-tile"><div class="tile-top"><div class="initials large">${esc(p.name.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase())}</div><div><button class="icon-button" data-action="person" data-id="${esc(p.id)}" title="Modifica">✎</button><button class="icon-button" data-action="deletePerson" data-id="${esc(p.id)}" title="Elimina">×</button></div></div><h3>${esc(p.name)}</h3><p>${esc(p.role)}</p><span class="tag">${esc(office(p.officeId)?.name)}</span><div class="tile-bottom"><span>Obiettivi nel mese</span><b>${ownGoals(p.id).length}</b></div><button class="text-button" data-action="goal" data-person="${esc(p.id)}">+ Assegna obiettivo →</button></article>`).join("")}</div>`}`;}
function goalsPage(){
let gs=db.goals.filter(g=>g.month===ui.month&&(ui.office==="all"||person(g.personId)?.officeId===ui.office));
return `<div class="section-title"><div><h2>Obiettivi del mese</h2><p>Target individuali commerciali e gestionali, con consuntivo aggiornato.</p></div><button class="primary" data-action="goal">+ Nuovo obiettivo</button></div><div class="filters"><label>Ufficio<select id="officeFilter"><option value="all">Tutti gli uffici</option>${selectOpts(db.offices,ui.office)}</select></label><button class="secondary" data-action="copyGoals">Copia dal mese precedente</button><button class="secondary" data-nav="settings">⚙ Gestisci categorie</button></div>${!gs.length?`<div class="empty"><div>◎</div><b>Nessun obiettivo per ${esc(dateTitle(ui.month))}</b><p>Assegna obiettivi individuali ai collaboratori per questo mese.</p></div>`:`<div class="goal-grid">${gs.map(g=>{let p=person(g.personId);return `<article class="goal-card"><div class="goal-head"><span class="tag ${g.category==="Gestionale"?"light":""}">${esc(g.category)}</span><div><button class="icon-button" data-action="goal" data-id="${esc(g.id)}" title="Modifica">✎</button><button class="icon-button" data-action="deleteGoal" data-id="${esc(g.id)}" title="Elimina">×</button></div></div><h3>${esc(g.name)}</h3><p>${esc(p?.name)} · ${esc(office(p?.officeId)?.name)}</p><div class="goal-numbers"><span><small>Raggiunto</small><strong>${pretty(g,val(g))}</strong></span><span><small>Target</small><strong>${pretty(g,g.target)}</strong></span></div>${pBar(pct(g))}<div class="tile-bottom"><span>Avanzamento</span><b>${Math.round(pct(g))}%</b></div></article>`}).join("")}</div>`}`;}
function dailyPage(){
const oid=ui.office==="all"?db.offices[0]?.id:ui.office;
if(!oid)return `<div class="empty">Nessun ufficio</div>`;
const ps=db.people.filter(p=>p.officeId===oid);
const date=ui.date.startsWith(ui.month)?ui.date:ui.month+"-01";
let total=0;
const cards=ps.map(p=>{const gs=ownGoals(p.id);if(!gs.length)return "";total+=gs.length;return `<div class="register-person"><div class="register-header"><span class="initials">${esc(p.name.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase())}</span><div><b>${esc(p.name)}</b><small>${esc(p.role)}</small></div></div>${gs.map(g=>{const e=db.entries.find(e=>e.goalId===g.id&&e.date===date);return `<label class="register-row"><span><b>${esc(g.name)}</b><small>${esc(g.category)} · mese ${pretty(g,val(g))} / ${pretty(g,g.target)}</small></span><div class="value-input"><input type="number" min="0" step="any" inputmode="decimal" name="goal_${esc(g.id)}" data-goal="${esc(g.id)}" placeholder="—" ${e?`value="${esc(e.value)}"`:""}><i>${esc(g.unit)}</i></div></label>`;}).join("")}</div>`;}).filter(Boolean).join("");
return `<div class="section-title"><div><h2>Registro rapido</h2><p>Compila più risultati e salva una sola volta. Ogni valore è riferito al giorno selezionato.</p></div></div><form id="dailyForm"><div class="filters two"><label>Ufficio<select id="dailyOffice">${selectOpts(db.offices,oid)}</select></label><label>Giorno<input id="dailyDate" type="date" value="${esc(date)}"></label></div><div class="info-line">✓ Lascia vuoto per non modificare · Scrivi <b>0</b> per registrare zero · Un valore già presente può essere corretto.</div>${!total?`<div class="empty"><div>✎</div><b>Nessun obiettivo da compilare</b><p>Inserisci i collaboratori e assegna loro obiettivi per ${esc(dateTitle(ui.month))}.</p><button type="button" class="primary" data-nav="goals">Vai agli obiettivi</button></div>`:cards+`<div class="sticky-save"><div><b>${total} indicatori disponibili</b><small>${esc(office(oid)?.name)} · ${shortDate(date)}</small></div><button class="primary" type="submit">Salva giornata ✓</button></div>`}</form>`;}
function historyPage(){
const es=db.entries.filter(e=>e.date.startsWith(ui.month)&&(ui.office==="all"||person(db.goals.find(g=>g.id===e.goalId)?.personId)?.officeId===ui.office)).sort((a,b)=>b.date.localeCompare(a.date));
return `<div class="section-title"><div><h2>Storico rilevazioni</h2><p>Consulta i risultati del mese, correggili dal registro o elimina una rilevazione.</p></div><button class="secondary" data-action="csvEntries">Esporta CSV ↓</button></div><div class="filters"><label>Ufficio<select id="officeFilter"><option value="all">Tutti gli uffici</option>${selectOpts(db.offices,ui.office)}</select></label></div>${!es.length?`<div class="empty">Nessuna rilevazione per questo mese.</div>`:`<div class="history-list">${es.map(e=>{const g=db.goals.find(g=>g.id===e.goalId),p=g&&person(g.personId);return `<div class="history-row"><div><b>${shortDate(e.date)}</b><small>${esc(p?.name)} · ${esc(office(p?.officeId)?.name)}</small><div>${esc(g?.name)}</div></div><strong>${g?pretty(g,e.value):fmt(e.value)}</strong><button class="icon-button" title="Elimina rilevazione" data-action="deleteEntry" data-id="${esc(e.id)}">×</button></div>`;}).join("")}</div>`}`;}
function catalogSection(){
  const list=(key)=>`<div class="catalog-group"><div class="catalog-group-top"><div><h3>${esc(catalogLabels[key])}</h3><p>${key==="roles"?"Modifica i ruoli disponibili nelle schede dei collaboratori.":key==="categories"?"Personalizza le categorie associate agli obiettivi.":"Aggiungi o modifica le unità usate nei target."}</p></div><button type="button" class="secondary" data-action="catalogAdd" data-cat="${key}">+ Aggiungi</button></div><div class="catalog-items">${db.catalogs[key].map(value=>`<div class="catalog-row"><span><b>${esc(value)}</b><small>${catalogUsage(key,value)} ${key==="roles"?"collaboratori":"obiettivi"} collegati</small></span><div class="catalog-actions"><button class="icon-button" type="button" title="Rinomina voce" aria-label="Rinomina ${esc(value)}" data-action="catalogRename" data-cat="${key}" data-value="${esc(value)}">✎</button><button class="icon-button" type="button" title="Elimina voce" aria-label="Elimina ${esc(value)}" data-action="catalogRemove" data-cat="${key}" data-value="${esc(value)}">×</button></div></div>`).join("")}</div></div>`;
  return `<div class="catalog-management"><div><h2>Personalizza le categorie</h2><p>Aggiungi, rinomina o elimina le voci dei menu senza perdere le assegnazioni. Le rinomine si applicano automaticamente anche ai dati esistenti.</p></div>${["roles","categories","units"].map(list).join("")}</div>`;
}
function settingsPage(){return `<div class="section-title"><div><h2>Impostazioni e categorie</h2><p>Personalizza i menu e gestisci gli archivi sul dispositivo.</p></div></div><section class="panel settings-stack">${catalogSection()}<div class="alert"><b>Attenzione: archivio locale, senza login.</b><p>Il sito è pubblico ma i dati inseriti restano in questo browser, non vengono caricati su GitHub. Non inserire dati personali di dipendenti o informazioni aziendali riservate senza autorizzazione, adeguate misure di sicurezza e verifica privacy.</p></div><div><h3>Esportazione e backup</h3><p>Effettua regolarmente un backup JSON e conservalo in modo sicuro: cancellando i dati del browser perderesti i risultati.</p><div class="action-row"><button class="secondary" data-action="backup">Backup JSON ↓</button><button class="secondary" data-action="csvGoals">Obiettivi CSV ↓</button><button class="secondary" data-action="csvEntries">Rilevazioni CSV ↓</button></div></div><div><h3>Ripristina archivio</h3><p>Importa un backup JSON creato da Manicomio, sostituendo i dati locali esistenti.</p><label class="file"><input type="file" accept=".json,application/json" id="importFile"> Seleziona file JSON</label></div><div><h3>Gestione dei mesi</h3><button class="secondary" data-action="copyGoals">Copia i target dal mese precedente</button></div><div><h3>Installa sul telefono</h3><p><b>iPhone:</b> apri l'indirizzo in Safari → Condividi → Aggiungi alla schermata Home. <b>Android:</b> usa la voce Installa app nel menu di Chrome. Dopo il primo accesso l'app può funzionare anche offline.</p></div><div class="danger"><h3>Azzeramento</h3><p>Elimina uffici personalizzati, collaboratori, obiettivi e rilevazioni dal dispositivo.</p><button class="danger-btn" data-action="reset">Svuota archivio</button></div></section>`;}
function showModal(title,body,kind,record,submit="Salva"){let root=$("#dialog");root.innerHTML=`<div class="shade" data-action="dismiss"><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-head"><h2>${esc(title)}</h2><button class="icon-button" type="button" data-action="dismiss">✕</button></div><form id="editForm" data-kind="${esc(kind)}" data-id="${esc(record||"")}"><div class="modal-body">${body}</div><div class="modal-footer"><button type="button" class="secondary" data-action="dismiss">Annulla</button><button type="submit" class="primary">${esc(submit)}</button></div></form></div></div>`;}
function closeModal(){$("#dialog").innerHTML="";}
function input(label,name,val="",type="text",extra=""){return `<label class="field">${esc(label)}<input name="${esc(name)}" type="${esc(type)}" value="${esc(val)}" ${extra} required></label>`;}
function modOffice(id0){const o=office(id0);showModal("Rinomina ufficio",input("Nome ufficio","name",o?.name,"text",'maxlength="80"'),"office",id0);}
function modPerson(pid){const p=person(pid);showModal(p?"Modifica collaboratore":"Nuovo collaboratore",`${input("Nome e cognome","name",p?.name,"text",'maxlength="100"')}<label class="field">Ufficio<select name="officeId" required>${selectOpts(db.offices,p?.officeId||db.offices[0]?.id)}</select></label><label class="field">Ruolo<select name="role" required>${roleOpts(p?.role||"Sportello")}</select></label><button class="catalog-quick" type="button" data-action="catalogQuickAdd" data-cat="roles">+ Aggiungi un nuovo ruolo (es. DUP)</button>`,"person",pid);}
function modGoal(gid,preselect){const g=db.goals.find(x=>x.id===gid);if(!db.people.length){toast("Inserisci prima un collaboratore");change("people");return;}let p=g?.personId||preselect||db.people[0].id;const pers=db.people.map(x=>({id:x.id,name:x.name+" · "+(office(x.officeId)?.name||"")}));showModal(g?"Modifica obiettivo":"Assegna obiettivo",`<label class="field">Collaboratore<select name="personId" required>${selectOpts(pers,p)}</select></label>${input("Nome indicatore","name",g?.name||"","text",'maxlength="100"')}<div class="form-grid"><label class="field">Categoria<select name="category">${catalogOpts("categories",g?.category||db.catalogs.categories[0])}</select><button class="catalog-quick" type="button" data-action="catalogQuickAdd" data-cat="categories">+ Nuova categoria</button></label><label class="field">Unità<select name="unit">${catalogOpts("units",g?.unit||db.catalogs.units[0])}</select><button class="catalog-quick" type="button" data-action="catalogQuickAdd" data-cat="units">+ Nuova unità</button></label></div>${input("Target mensile","target",g?.target??"","number",'min="0.000001" step="any"')}<label class="field">Tipo di misurazione<select name="mode"><option value="sum" ${g?.mode!=="latest"?"selected":""}>Somma dei risultati giornalieri</option><option value="latest" ${g?.mode==="latest"?"selected":""}>Ultimo valore registrato (es. percentuale)</option></select></label><div class="info-line">Mese dell'obiettivo: <b>${esc(dateTitle(ui.month))}</b>. Puoi personalizzare ruoli, categorie e unità dalla schermata Impostazioni.</div>`,"goal",gid);}
function download(name,content,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
function csv(rows){return "\uFEFF"+rows.map(r=>r.map(x=>`"${String(x??"").replaceAll('"','""')}"`).join(";")).join("\r\n");}
function backup(){download("Manicomio_backup_"+day()+".json",JSON.stringify(db,null,2),"application/json");}
function csvGoals(){const rows=[["Mese","Ufficio","Collaboratore","Ruolo","Obiettivo","Categoria","Target","Unità","Consuntivo","Avanzamento %"]];db.goals.filter(g=>g.month===ui.month).forEach(g=>{const p=person(g.personId);rows.push([g.month,office(p?.officeId)?.name,p?.name,p?.role,g.name,g.category,g.target,g.unit,val(g),Math.round(pct(g))]);});download("Manicomio_obiettivi_"+ui.month+".csv",csv(rows),"text/csv;charset=utf-8");}
function csvEntries(){const rows=[["Data","Ufficio","Collaboratore","Obiettivo","Categoria","Valore","Unità"]];db.entries.filter(e=>e.date.startsWith(ui.month)).forEach(e=>{const g=db.goals.find(g=>g.id===e.goalId),p=g&&person(g.personId);rows.push([e.date,office(p?.officeId)?.name,p?.name,g?.name,g?.category,e.value,g?.unit]);});download("Manicomio_rilevazioni_"+ui.month+".csv",csv(rows),"text/csv;charset=utf-8");}
document.addEventListener("click",e=>{const nav=e.target.closest("[data-nav]");if(nav){ui.page=nav.dataset.nav;if(ui.page==="daily"&&ui.office==="all")ui.office=db.offices[0].id;render();window.scrollTo(0,0);return;}
const b=e.target.closest("[data-action]");if(!b)return;const action=b.dataset.action;const k=b.dataset.id;
if(action==="dismiss"){if(b.classList.contains("shade")&&e.target!==b)return;closeModal();return;}
if(action==="catalogQuickAdd"){const key=b.dataset.cat;const form=b.closest("form");const field={roles:"role",categories:"category",units:"unit"}[key];catalogAdd(key,form?.elements.namedItem(field));}
if(action==="catalogAdd")catalogAdd(b.dataset.cat);
if(action==="catalogRename")catalogRename(b.dataset.cat,b.dataset.value);
if(action==="catalogRemove")catalogRemove(b.dataset.cat,b.dataset.value);
if(action==="editOffice")modOffice(k);
if(action==="person")modPerson(k);
if(action==="goal")modGoal(k,b.dataset.person);
if(action==="jumpOffice"){ui.office=k;ui.page="daily";render();window.scrollTo(0,0);}
if(action==="deletePerson"){const p=person(k);if(p&&confirm("Eliminare "+p.name+" e tutti i suoi obiettivi e risultati?")){const gids=new Set(db.goals.filter(g=>g.personId===k).map(g=>g.id));db.entries=db.entries.filter(x=>!gids.has(x.goalId));db.goals=db.goals.filter(g=>g.personId!==k);db.people=db.people.filter(x=>x.id!==k);save();render();}}
if(action==="deleteGoal"){const g=db.goals.find(x=>x.id===k);if(g&&confirm("Eliminare l'obiettivo «"+g.name+"» e tutti i suoi risultati?")){db.goals=db.goals.filter(x=>x.id!==k);db.entries=db.entries.filter(x=>x.goalId!==k);save();render();}}
if(action==="deleteEntry"){if(confirm("Eliminare questa rilevazione?")){db.entries=db.entries.filter(x=>x.id!==k);save();render();}}
if(action==="backup")backup();
if(action==="csvGoals")csvGoals();
if(action==="csvEntries")csvEntries();
if(action==="reset"){if(confirm("ATTENZIONE: svuotare tutto l'archivio locale? Assicurati di aver esportato un backup.")&&confirm("Confermi la cancellazione definitiva?")){db=blank();save();ui.office="all";change("dashboard");}}
if(action==="copyGoals"){const pm=prevMonth(ui.month),src=db.goals.filter(g=>g.month===pm),existing=new Set(db.goals.filter(g=>g.month===ui.month).map(g=>g.personId+"|"+g.name.toLowerCase()));let n=0;for(const g of src){const key=g.personId+"|"+g.name.toLowerCase();if(existing.has(key))continue;db.goals.push({...g,id:id(),month:ui.month});existing.add(key);n++;}save();render();toast(n?n+" obiettivi copiati":"Nessun nuovo obiettivo da copiare");}
});
document.addEventListener("change",async e=>{
const t=e.target;
if(t.id==="month"){ui.month=t.value;ui.date=ui.month+"-01";render();return;}
if(t.id==="officeFilter"){ui.office=t.value;render();return;}
if(t.id==="dailyOffice"){ui.office=t.value;render();return;}
if(t.id==="dailyDate"){if(t.value.slice(0,7)!==ui.month){alert("Scegli una data del mese selezionato in alto.");render();return;}ui.date=t.value;render();return;}
if(t.id==="importFile"&&t.files?.[0]){try{const raw=JSON.parse(await t.files[0].text());if(!raw||!Array.isArray(raw.offices)||!Array.isArray(raw.people)||!Array.isArray(raw.goals)||!Array.isArray(raw.entries)||raw.offices.length<1)throw Error("Il file non è un backup valido.");if(confirm("Importare il backup? Sostituirà tutti i dati locali presenti.")){normalizeCatalog(raw);db=raw;save();ui.office="all";change("dashboard");toast("Backup importato");}}catch(err){alert("Importazione non riuscita: "+err.message);}}
});
document.addEventListener("submit",e=>{
e.preventDefault();const form=e.target;
if(form.id==="dailyForm"){const d=ui.date.startsWith(ui.month)?ui.date:ui.month+"-01";let n=0;form.querySelectorAll("[data-goal]").forEach(input=>{if(input.value.trim()==="")return;const v=Number(input.value);if(!Number.isFinite(v)||v<0)return;let old=db.entries.find(x=>x.goalId===input.dataset.goal&&x.date===d);if(old)old.value=v;else db.entries.push({id:id(),date:d,goalId:input.dataset.goal,value:v});n++;});if(n){save();render();toast(n+" valori salvati per il "+shortDate(d));}else toast("Nessun valore da salvare");return;}
if(form.id==="editForm"){const x=Object.fromEntries(new FormData(form));const kind=form.dataset.kind,rec=form.dataset.id;
if(kind==="office"){let o=office(rec);if(o)o.name=String(x.name||"").trim();}
if(kind==="person"){if(!x.name?.trim())return;let p=person(rec);if(p)Object.assign(p,{name:x.name.trim(),role:x.role,officeId:x.officeId});else db.people.push({id:id(),name:x.name.trim(),role:x.role,officeId:x.officeId});}
if(kind==="goal"){let p=person(x.personId);if(!p){alert("Collaboratore non valido");return;}const target=Number(x.target);if(!Number.isFinite(target)||target<=0){alert("Inserisci un target maggiore di zero.");return;}let g=db.goals.find(g=>g.id===rec);let obj={personId:x.personId,month:ui.month,name:x.name.trim(),category:x.category,target,unit:x.unit,mode:x.mode};if(g)Object.assign(g,obj);else db.goals.push({id:id(),...obj});}
if(save()){closeModal();render();toast("Salvato correttamente");}
}
});
save();render();
if("serviceWorker" in navigator&&location.protocol==="https:")navigator.serviceWorker.register("./sw.js").catch(()=>{});
})();