import { app } from '../state.js';
import { esc } from '../utils.js';
import { DESIGNATIONS, TL_META } from '../constants.js';
import { api } from '../api.js';
import { modal, closeModal } from '../modal.js';
import { toast } from '../utils.js';

export function renderUsers(){
  document.querySelector("#view").innerHTML=`
  <div class="section-note">
    <svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="8" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M9 8v5M9 5v.5" stroke="currentColor" stroke-width="1.6"/></svg>
    <div>Manager-level access control. <b>Admin</b> sees everything; <b>Team Leader</b> sees only their own team; <b>Sales/CA</b> sees only their own numbers and attendance.</div>
  </div>
  <div class="toolbar"><div class="spacer"></div><button class="btn sm" onclick="openUserForm()">+ Add user</button></div>
  <div class="panel"><div class="pb flush"><div class="tblwrap"><table>
    <thead><tr><th>Username</th><th>Name</th><th>Role</th><th>Designation</th><th>Scope</th><th>PIN</th><th></th></tr></thead>
    <tbody>${app.DB.users.map((u,i)=>`<tr>
      <td><b class="mono">${esc(u.username)}</b></td><td>${esc(u.name)}</td>
      <td><span class="tag ${u.role==='admin'?'pri':u.role==='tl'?'warn':'gray'}">${({admin:'Manager',tl:'Team Leader',sales:'Sales/CA'})[u.role]}</span></td>
      <td>${esc(u.designation||"—")}</td>
      <td>${esc(u.tl||u.cp||u.loc||"All")}</td><td class="mono">••••</td>
      <td><button class="btn tiny ghost" onclick="openUserForm(${i})">Edit</button>
        ${u.username!=='admin'?`<button class="btn tiny ghost" onclick="delUser(${i})">✕</button>`:""}</td>
    </tr>`).join("")}</tbody>
  </table></div></div></div>`;
}

export function openUserForm(idx){
  const u = idx>=0 ? app.DB.users[idx] : null;
  modal(`${u?"Edit":"Add"} User`,`
    <div class="formgrid ff">
      <div><label>Username</label><input class="inp" id="u_u" value="${u?esc(u.username):""}"></div>
      <div><label>PIN / Password${u?' (leave blank = keep)':''}</label><input class="inp" id="u_p" type="password" value="" placeholder="${u?'••••':''}"></div>
      <div><label>Display Name</label><input class="inp" id="u_name" value="${u?esc(u.name):""}"></div>
      <div><label>Role</label><select id="u_role" onchange="userScope()">
        <option value="admin" ${u&&u.role==='admin'?'selected':''}>Manager / Admin</option>
        <option value="tl" ${u&&u.role==='tl'?'selected':''}>Team Leader</option>
        <option value="sales" ${u&&u.role==='sales'?'selected':''}>Sales / CA</option></select></div>
      <div><label>Designation</label><select class="inp" id="u_designation">
        <option value="" ${!u||!u.designation?'selected':''}>— Select —</option>
        ${DESIGNATIONS.map(d=>`<option value="${d}" ${u&&u.designation===d?'selected':''}>${d}</option>`).join("")}
      </select></div>
      <div style="grid-column:1/-1" id="scopeWrap"></div>
    </div>`,[
    {label:"Cancel",cls:"ghost",fn:closeModal},
    {label:u?"Save":"Add",cls:"",fn:async()=>{
      const role = document.querySelector("#u_role").value;
      const rec = {
        u: document.querySelector("#u_u").value.trim().toLowerCase(),
        p: document.querySelector("#u_p").value.trim(),
        name: document.querySelector("#u_name").value.trim(),
        role,
        designation: document.querySelector("#u_designation").value||null
      };
      const sc = document.querySelector("#u_scope") ? document.querySelector("#u_scope").value : "All";
      if(role==="tl"){ rec.tl=sc; rec.loc=(TL_META[sc]&&TL_META[sc].loc)||(app.DB.roster.find(r=>r.tl===sc)||{}).loc||"All"; }
      else if(role==="sales"){ rec.cp=sc; rec.loc=(app.DB.roster.find(r=>r.name===sc)||{}).loc||"All"; }
      else rec.loc="All";
      if(!rec.u||(!u&&!rec.p)){ toast("Username & PIN required","bad"); return; }
      try{
        if(idx>=0) await api("/users/"+u.id,{method:"PUT",body:rec});
        else await api("/users",{method:"POST",body:rec});
      }catch(e){ toast(e.message,"bad"); return; }
      const {users} = await api("/bootstrap?month="+app.CURMONTH);
      app.DB.users = users;
      closeModal(); renderUsers(); toast("User saved","ok");
    }}
  ]);
  userScope(u);
}

export function userScope(u){
  const role = document.querySelector("#u_role").value;
  const w = document.querySelector("#scopeWrap");
  if(!w) return;
  if(role==="admin"){
    w.innerHTML=`<label>Scope</label><input class="inp" value="All locations" readonly style="background:#f0f3f8">`;
    return;
  }
  if(role==="tl"){
    const tls = [...new Set(app.DB.roster.map(r=>r.tl))];
    w.innerHTML=`<label>Which team leader?</label><select id="u_scope">${tls.map(t=>`<option ${u&&u.tl===t?'selected':''}>${esc(t)}</option>`).join("")}</select>`;
    return;
  }
  w.innerHTML=`<label>Which sales person?</label><select id="u_scope">${app.DB.roster.map(r=>`<option ${u&&u.cp===r.name?'selected':''}>${esc(r.name)}</option>`).join("")}</select>`;
}

export async function delUser(idx){
  if(!confirm("Delete user?")) return;
  try{ await api("/users/"+app.DB.users[idx].id,{method:"DELETE"}); }catch(e){ toast(e.message,"bad"); return; }
  app.DB.users.splice(idx,1); renderUsers(); toast("Deleted","ok");
}
