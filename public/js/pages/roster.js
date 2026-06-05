import { app } from '../state.js';
import { esc } from '../utils.js';
import { LOCATIONS, DESIGNATIONS } from '../constants.js';
import { api } from '../api.js';
import { modal, closeModal } from '../modal.js';
import { toast } from '../utils.js';

export function renderRoster(){
  const ros = app.DB.roster.filter(r=>!app.rosterSearch||(r.name+r.tl+r.loc+r.code+(r.designation||"")).toLowerCase().includes(app.rosterSearch));
  const tls = new Set(app.DB.roster.map(r=>r.tl)).size;
  document.querySelector("#view").innerHTML=`
  <div class="grid cards" style="margin-bottom:16px">
    <div class="kpi"><div class="lab">Sales Persons</div><div class="val">${app.DB.roster.length}</div></div>
    <div class="kpi"><div class="lab">Team Leaders</div><div class="val">${tls}</div></div>
    <div class="kpi"><div class="lab">Locations</div><div class="val">${new Set(app.DB.roster.map(r=>r.loc)).size}</div></div>
  </div>
  <div class="toolbar">
    <div class="search"><svg width="15" height="15" viewBox="0 0 15 15"><circle cx="6" cy="6" r="4.5" fill="none" stroke="#888" stroke-width="1.4"/><path d="M10 10l4 4" stroke="#888" stroke-width="1.4"/></svg>
      <input class="inp" placeholder="Search name, TL, location…" oninput="app.rosterSearch=this.value.toLowerCase();renderRoster()"></div>
    <div class="spacer"></div>
    <button class="btn sm ghost" onclick="importRoster()">⤒ Bulk import (CSV)</button>
    <button class="btn sm" onclick="openRosterForm()">+ Add person</button>
  </div>
  <div class="panel"><div class="pb flush"><div class="tblwrap"><table>
    <thead><tr><th>Emp Code</th><th>Sales Person</th><th>Designation</th><th>Team Leader</th><th>Location</th><th></th></tr></thead>
    <tbody>${ros.map(r=>`<tr>
      <td class="num">${esc(r.code)}</td><td><b>${esc(r.name)}</b></td><td>${esc(r.designation||"—")}</td><td>${esc(r.tl)}</td><td>${esc(r.loc)}</td>
      <td style="white-space:nowrap"><button class="btn tiny ghost" onclick="openRosterForm(${app.DB.roster.indexOf(r)})">Edit</button>
      <button class="btn tiny ghost" onclick="delRoster(${app.DB.roster.indexOf(r)})">✕</button></td>
    </tr>`).join("")}</tbody>
  </table></div></div></div>`;
}

export function openRosterForm(idx){
  const r = idx>=0 ? app.DB.roster[idx] : null;
  modal(`${r?"Edit":"Add"} Sales Person`,`
    <div class="formgrid ff">
      <div><label>Emp Code</label><input class="inp" id="r_code" value="${r?esc(r.code):""}"></div>
      <div><label>Name</label><input class="inp" id="r_name" value="${r?esc(r.name):""}"></div>
      <div><label>Team Leader</label><input class="inp" id="r_tl" list="tlList" value="${r?esc(r.tl):""}">
        <datalist id="tlList">${[...new Set(app.DB.roster.map(x=>x.tl))].map(t=>`<option>${esc(t)}</option>`).join("")}</datalist></div>
      <div><label>Location</label><select id="r_loc">${LOCATIONS.map(l=>`<option ${r&&r.loc===l?"selected":""}>${l}</option>`).join("")}</select></div>
      <div><label>Designation</label><select class="inp" id="r_designation">
        <option value="" ${!r||!r.designation?'selected':''}>— Select —</option>
        ${DESIGNATIONS.map(d=>`<option value="${d}" ${r&&r.designation===d?'selected':''}>${d}</option>`).join("")}
      </select></div>
    </div>`,[
    {label:"Cancel",cls:"ghost",fn:closeModal},
    {label:r?"Save":"Add",cls:"",fn:async()=>{
      const rec={code:document.querySelector("#r_code").value.trim(),name:document.querySelector("#r_name").value.trim(),tl:document.querySelector("#r_tl").value.trim(),loc:document.querySelector("#r_loc").value,designation:document.querySelector("#r_designation").value||null};
      if(!rec.name){ toast("Name required","bad"); return; }
      try{
        if(idx>=0){ await api("/roster/"+encodeURIComponent(r.code),{method:"PUT",body:rec}); app.DB.roster[idx]=rec; }
        else { await api("/roster",{method:"POST",body:rec}); app.DB.roster.push(rec); }
      }catch(e){ toast(e.message,"bad"); return; }
      closeModal(); renderRoster(); toast("Saved","ok");
    }}
  ]);
}

export async function delRoster(idx){
  if(!confirm("Remove "+app.DB.roster[idx].name+"?")) return;
  try{ await api("/roster/"+encodeURIComponent(app.DB.roster[idx].code),{method:"DELETE"}); }catch(e){ toast(e.message,"bad"); return; }
  app.DB.roster.splice(idx,1); renderRoster(); toast("Removed","ok");
}

export function importRoster(){
  modal("Bulk import roster",`
    <div class="ff"><label>Paste CSV — columns: <b>Code, Name, Team Leader, Location</b> (one per line)</label>
    <textarea id="imp" style="min-height:160px" placeholder="4101, Aakash, Atul Mishra, Dilshad Garden
4102, Vijay Prakash, Atul Mishra, Dilshad Garden"></textarea>
    <div class="help">Existing list is kept; new rows are appended. Use this to load all 390 sales persons at once.</div></div>`,[
    {label:"Cancel",cls:"ghost",fn:closeModal},
    {label:"Import",cls:"",fn:async()=>{
      const lines=document.querySelector("#imp").value.trim().split(/\n/).filter(Boolean); const rows=[];
      lines.forEach(l=>{ const p=l.split(",").map(x=>x.trim()); if(p.length>=2) rows.push({code:p[0]||"",name:p[1],tl:p[2]||"",loc:p[3]||LOCATIONS[0]}); });
      try{ app.DB.roster = await api("/roster/bulk",{method:"POST",body:{rows}}); }catch(e){ toast(e.message,"bad"); return; }
      closeModal(); renderRoster(); toast(rows.length+" people imported","ok");
    }}
  ]);
}
