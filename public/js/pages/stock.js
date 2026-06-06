import { app, can } from '../state.js';
import { esc, today, uid, monthKey } from '../utils.js';
import { LOCATIONS } from '../constants.js';
import { api } from '../api.js';
import { modal, closeModal } from '../modal.js';
import { toast } from '../utils.js';

const fmtDT = s => {
  if(!s) return '—';
  const [date, time=''] = s.split('T');
  const [y,m,day] = date.split('-');
  const months = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${day} ${months[+m]} ${y}${time ? ', '+time : ''}`;
};

export function renderStock(){
  document.querySelector("#view").innerHTML=`
  <div class="toolbar">
    <div class="seg">
      <button class="${app.stockTab==='all'?'on':''}" onclick="app.stockTab='all';renderStockTbl()">All</button>
      <button class="${app.stockTab==='Purchase'?'on':''}" onclick="app.stockTab='Purchase';renderStockTbl()">Part Purchase</button>
      <button class="${app.stockTab==='Transfer'?'on':''}" onclick="app.stockTab='Transfer';renderStockTbl()">Stock Transfer</button>
    </div>
    <div class="spacer"></div>
    ${can.enterStock()?`<button class="btn sm" onclick="openStockForm()">+ New Entry</button>`:""}
  </div>
  <div class="grid cards" id="stockKpi" style="margin-bottom:16px"></div>
  <div class="panel"><div class="pb flush" id="stockTbl"></div></div>`;
  renderStockTbl();
}

export function renderStockTbl(){
  let rows = app.DB.stock.filter(s=>monthKey(s.date)===app.CURMONTH);
  if(app.stockTab!=="all") rows = rows.filter(s=>s.kind===app.stockTab);
  rows.sort((a,b)=>b.date.localeCompare(a.date));
  document.querySelector("#stockKpi").innerHTML=`
    <div class="kpi"><div class="lab">Total Line Items</div><div class="val">${app.DB.stock.filter(s=>monthKey(s.date)===app.CURMONTH).length}</div><div class="sub">this month</div></div>
    <div class="kpi ok"><div class="lab">Parts Purchased (Qty)</div><div class="val">${app.DB.stock.filter(s=>monthKey(s.date)===app.CURMONTH&&s.kind==='Purchase').reduce((t,s)=>t+(+s.qty||0),0)}</div><div class="sub">${app.DB.stock.filter(s=>monthKey(s.date)===app.CURMONTH&&s.kind==='Purchase').length} POs</div></div>
    <div class="kpi warn"><div class="lab">Transferred (Qty)</div><div class="val">${app.DB.stock.filter(s=>monthKey(s.date)===app.CURMONTH&&s.kind==='Transfer').reduce((t,s)=>t+(+s.qty||0),0)}</div><div class="sub">${app.DB.stock.filter(s=>monthKey(s.date)===app.CURMONTH&&s.kind==='Transfer').length} transfers</div></div>`;
  document.querySelector("#stockTbl").innerHTML=`<div class="tblwrap"><table>
    <thead><tr><th>Date</th><th>Location</th><th>Part Order Description</th><th>Delivery Status</th><th>Acc/PO</th><th></th></tr></thead>
    <tbody>${rows.length?rows.map(s=>`<tr>
      <td class="num">${fmtDT(s.date)}</td>
      <td>${esc(s.location||'—')}</td>
      <td>${esc(s.partOrderDesc||'—')}</td>
      <td><span class="tag ${s.deliveryStatus==='Yes'?'ok':'gray'}">${esc(s.deliveryStatus||'No')}</span></td>
      <td class="num">${esc(s.accW||'—')}</td>
      <td>${can.enterStock()?`<button class="btn tiny ghost" onclick="openStockForm('${s.id}')">Edit</button>`:""}</td>
    </tr>`).join(""):`<tr><td colspan=6 class="empty"><b>No stock movements</b>Add a purchase or transfer entry</td></tr>`}</tbody>
  </table></div>`;
}

export function openStockForm(id){
  const s = id ? app.DB.stock.find(x=>x.id===id) : null;
  const locOpts = v => ["Vendor (Purchase)",...LOCATIONS].map(l=>`<option ${v===l?"selected":""}>${l}</option>`).join("");
  const locSel  = v => LOCATIONS.map(l=>`<option ${v===l?"selected":""}>${l}</option>`).join("");
  modal(`${s?"Edit":"New"} Stock Entry`,`
    <div class="formgrid ff">
      <div><label>Date &amp; Time</label><input class="inp" id="s_date" type="datetime-local" value="${s?s.date:today()+'T00:00'}"></div>
      <div><label>Location</label><select class="inp" id="s_loc">
        <option value="" ${!s||!s.location?'selected':''}>— Select —</option>
        ${locSel(s?s.location:'')}
      </select></div>
      <div style="grid-column:1/-1"><label>Part Order Description</label>
        <input class="inp" id="s_pod" value="${s?esc(s.partOrderDesc):''}" placeholder="e.g. Dash Cam, Seat Cover, Floor Mats…"></div>
      <div><label>Vehicle Delivery Status</label><select class="inp" id="s_ds">
        <option value="No"  ${!s||s.deliveryStatus==='No' ?'selected':''}>No</option>
        <option value="Yes" ${s&&s.deliveryStatus==='Yes'?'selected':''}>Yes</option>
      </select></div>
      <div><label>Acc. Work / PO No</label><input class="inp" id="s_accw" value="${s?esc(s.accW):''}"></div>
      <div><label>Type</label><select id="s_kind" onchange="onKind()">
        <option value="Transfer" ${s&&s.kind==='Transfer'?'selected':''}>Stock Transfer</option>
        <option value="Purchase" ${s&&s.kind==='Purchase'?'selected':''}>Part Purchase</option></select></div>
      <div><label>From</label><select id="s_from">${locOpts(s?s.from:"Patparganj")}</select></div>
      <div><label>To</label><select id="s_to">${locOpts(s?s.to:LOCATIONS[2])}</select></div>
      <div><label>Part No</label><input class="inp" id="s_pn" value="${s?esc(s.partNo):''}" placeholder="885732…"></div>
      <div><label>Quantity</label><input class="inp" id="s_qty" type="number" min="1" value="${s?s.qty:1}"></div>
      <div style="grid-column:1/-1"><label>Part Description</label><input class="inp" id="s_desc" value="${s?esc(s.desc):''}" placeholder="e.g. Door Visors Punch"></div>
      <div style="grid-column:1/-1"><label>DMS Remarks / Invoice</label><input class="inp" id="s_rem" value="${s?esc(s.remarks):''}"></div>
    </div>`,[
    {label:"Cancel",cls:"ghost",fn:closeModal},
    {label:s?"Save":"Add entry",cls:"",fn:()=>saveStock(id)}
  ]);
}

export function onKind(){
  const k = document.querySelector("#s_kind").value;
  if(k==="Purchase") document.querySelector("#s_from").value = "Vendor (Purchase)";
}

export async function saveStock(id){
  const g = x => document.querySelector("#"+x).value;
  const kind = g("s_kind");
  if(!g("s_pod").trim() && !g("s_desc").trim()){ toast("Part order description required","bad"); return; }
  const rec = {
    id: id||uid(), kind, date: g("s_date"), from: g("s_from"), to: g("s_to"),
    partNo: g("s_pn").trim(), desc: g("s_desc").trim(), qty: +g("s_qty")||1,
    accW: g("s_accw").trim(),
    cate: kind==="Purchase"?"Purchase":(g("s_from").includes("Patparganj")||g("s_from").includes("Dilshad")?"D TO N":"N TO N"),
    remarks: g("s_rem").trim(),
    location: g("s_loc"), partOrderDesc: g("s_pod").trim(), deliveryStatus: g("s_ds")
  };
  try{
    const saved = id ? await api("/stock/"+id,{method:"PUT",body:rec})
                     : await api("/stock",{method:"POST",body:rec});
    if(id){ const i=app.DB.stock.findIndex(x=>x.id===id); app.DB.stock[i]=saved; }
    else app.DB.stock.unshift(saved);
  }catch(e){ toast(e.message,"bad"); return; }
  closeModal(); renderStock(); toast(id?"Entry updated":"Stock entry added","ok");
}
