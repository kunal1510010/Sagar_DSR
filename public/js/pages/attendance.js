import { app, rosterForMe } from '../state.js';
import { esc, today } from '../utils.js';
import { ATT_STATUS, DESIGNATIONS } from '../constants.js';
import { api, loadAttendance, refreshTodayAtt } from '../api.js';
import { locFilterCtl } from '../nav.js';
import { toast } from '../utils.js';

export async function renderAttend(){
  try{ await loadAttendance(app.attDate); }catch(e){ toast(e.message,"bad"); }
  let ros = rosterForMe();
  if(app.attDesigF) ros = ros.filter(r=>r.designation===app.attDesigF);
  const marks = app.DB.attendance.filter(a=>a.date===app.attDate);
  const status = code => { const m=marks.find(x=>x.code===code); return m?m.status:""; };
  const counts = {}; ATT_STATUS.forEach(s=>counts[s]=0); marks.forEach(m=>counts[m.status]=(counts[m.status]||0)+1);
  const marked = marks.length;

  document.querySelector("#view").innerHTML=`
  <div class="toolbar">
    <label class="ff" style="margin:0"><input class="inp" type="date" value="${app.attDate}" onchange="app.attDate=this.value;renderAttend()"></label>
    ${locFilterCtl()}
    <select onchange="app.attDesigF=this.value;renderAttend()">
      <option value="" ${!app.attDesigF?'selected':''}>All Designations</option>
      ${DESIGNATIONS.map(d=>`<option value="${d}" ${app.attDesigF===d?'selected':''}>${d}</option>`).join("")}
    </select>
    <div class="spacer"></div>
    <button class="btn sm ghost" onclick="markAll('Present')">Mark all Present</button>
  </div>
  <div class="grid cards" style="margin-bottom:16px">
    <div class="kpi"><div class="lab">Team Strength</div><div class="val">${ros.length}</div></div>
    <div class="kpi ok"><div class="lab">Present</div><div class="val">${counts.Present||0}</div></div>
    <div class="kpi bad"><div class="lab">Absent</div><div class="val">${counts.Absent||0}</div></div>
    <div class="kpi warn"><div class="lab">Leave / Off</div><div class="val">${(counts.Leave||0)+(counts['Week Off']||0)+(counts['Half Day']||0)+(counts['Late Coming']||0)}</div></div>
    <div class="kpi"><div class="lab">Marked</div><div class="val">${marked}/${ros.length}</div></div>
  </div>
  <div class="panel"><div class="pb flush"><div class="tblwrap"><table>
    <thead><tr><th>Code</th><th>DMS ID</th><th>Sales Person</th><th>Designation</th><th>Team Leader</th><th>Location</th><th>Status</th></tr></thead>
    <tbody>${ros.length?ros.map(r=>`<tr>
      <td class="num">${esc(r.code)}</td><td class="num">${esc(r.dms_id||"—")}</td><td><b>${esc(r.name)}</b></td><td>${esc(r.designation||"—")}</td><td>${esc(r.tl)}</td><td>${esc(r.loc)}</td>
      <td><select onchange="mark('${esc(r.code)}',this.value)" style="padding:6px 9px;border:1.5px solid var(--line);border-radius:8px;${statusColor(status(r.code))}">
        <option value="">—</option>${ATT_STATUS.map(s=>`<option ${status(r.code)===s?"selected":""}>${s}</option>`).join("")}</select></td>
    </tr>`).join(""):`<tr><td colspan=7 class="empty"><b>No team members</b>Add people under Roster / Teams</td></tr>`}</tbody>
  </table></div></div></div>`;
}

export function statusColor(s){
  return s==="Present"?"color:var(--ok);font-weight:600"
       : s==="Absent"?"color:var(--bad);font-weight:600"
       : s?"color:var(--warn);font-weight:600":"";
}

export async function mark(code, status){
  try{ await api("/attendance",{method:"POST",body:{date:app.attDate,code,status}}); }catch(e){ toast(e.message,"bad"); return; }
  app.DB.attendance = app.DB.attendance.filter(a=>!(a.date===app.attDate&&a.code===code));
  if(status) app.DB.attendance.push({date:app.attDate,code,status});
  if(app.attDate===today()) await refreshTodayAtt();
}

export async function markAll(status){
  const codes = rosterForMe().map(r=>r.code);
  try{ await api("/attendance/bulk",{method:"POST",body:{date:app.attDate,codes,status}}); }catch(e){ toast(e.message,"bad"); return; }
  if(app.attDate===today()) await refreshTodayAtt();
  renderAttend(); toast("All marked "+status,"ok");
}
