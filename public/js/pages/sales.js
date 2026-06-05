import { app, can, monthSales } from '../state.js';
import { esc, fmtINR, today, uid } from '../utils.js';
import { MODELS, SALE_TYPES, ZERO_REASONS } from '../constants.js';
import { api } from '../api.js';
import { modal, closeModal } from '../modal.js';
import { monthPicker, locFilterCtl, buildNav } from '../nav.js';
import { toast } from '../utils.js';

export function renderSales(){
  document.querySelector("#view").innerHTML=`
  <div class="section-note">
    <svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="8" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M9 8v5M9 5v.5" stroke="currentColor" stroke-width="1.6"/></svg>
    <div>Enter one row per <b>delivered car</b>. If accessories paid = ₹0 it is auto-flagged a <b>Zero Car</b> and a reason is required — these feed the Red-Zone report.</div>
  </div>
  <div class="toolbar">
    ${monthPicker()} ${locFilterCtl()}
    <div class="search"><svg width="15" height="15" viewBox="0 0 15 15"><circle cx="6" cy="6" r="4.5" fill="none" stroke="#888" stroke-width="1.4"/><path d="M10 10l4 4" stroke="#888" stroke-width="1.4"/></svg>
      <input class="inp" placeholder="Search customer, CA, chassis…" oninput="app.salesSearch=this.value.toLowerCase();renderSalesTable()"></div>
    <div class="spacer"></div>
    ${can.enterSales()?`<button class="btn sm" onclick="openSaleForm()">+ New Delivery</button>`:""}
  </div>
  <div class="panel"><div class="pb flush" id="salesTbl"></div></div>`;
  renderSalesTable();
}

export function renderSalesTable(){
  const rows = monthSales().slice().sort((a,b)=>b.date.localeCompare(a.date))
    .filter(s=> !app.salesSearch || (s.customer+s.cp+s.model+s.chassis+s.tl).toLowerCase().includes(app.salesSearch));
  const html=`<div class="tblwrap"><table>
    <thead><tr><th>Date</th><th>Loc</th><th>Model</th><th>Customer</th><th>CA</th><th>Team Leader</th>
    <th>Type</th><th>Paid</th><th>FOC</th><th>Total</th><th>Status</th><th></th></tr></thead>
    <tbody>${rows.length?rows.map(s=>`<tr>
      <td class="num">${s.date.slice(8)}/${s.date.slice(5,7)}</td>
      <td>${esc(s.loc)}</td><td>${esc(s.model)}</td>
      <td><b>${esc(s.customer)}</b><div style="font-size:11px;color:var(--faint)" class="mono">${esc(s.chassis)}</div></td>
      <td>${esc(s.cp)}</td><td>${esc(s.tl)}</td>
      <td><span class="tag gray">${esc(s.saleType)}</span></td>
      <td class="num">${fmtINR(s.paid)}</td><td class="num">${s.foc?fmtINR(s.foc):"—"}</td>
      <td class="num"><b>${fmtINR(s.total)}</b></td>
      <td>${s.zero?`<span class="tag bad" title="${esc(s.zeroReason)}">ZERO</span>`:`<span class="tag ok">OK</span>`}${s.ew?` <span class="tag warn">EW</span>`:""}</td>
      <td style="white-space:nowrap">
        ${can.enterSales()?`<button class="btn tiny ghost" onclick="openSaleForm('${s.id}')">Edit</button>`:""}
        <button class="btn tiny ghost" onclick="quickOffer('${s.id}')" title="Send offer">💬</button>
      </td></tr>`).join(""):`<tr><td colspan=12 class="empty"><b>No deliveries this month</b>Click "+ New Delivery" to add the first entry</td></tr>`}</tbody>
  </table></div>`;
  document.querySelector("#salesTbl").innerHTML = html;
}

export function openSaleForm(id){
  const s = id ? app.DB.sales.find(x=>x.id===id) : null;
  const rosterOpts = app.DB.roster.map(r=>`<option value="${esc(r.name)}" data-tl="${esc(r.tl)}" data-loc="${esc(r.loc)}" ${s&&s.cp===r.name?"selected":""}>${esc(r.name)} — ${esc(r.tl)}</option>`).join("");
  modal(`${s?"Edit":"New"} Delivery Entry`, `
    <div class="formgrid ff">
      <div><label>Date of Delivery</label><input class="inp" id="f_date" type="date" value="${s?s.date:today()}"></div>
      <div><label>Model</label><select id="f_model">${MODELS.map(m=>`<option ${s&&s.model===m?"selected":""}>${m}</option>`).join("")}</select></div>
      <div><label>Sale Type</label><select id="f_type">${SALE_TYPES.map(t=>`<option ${s&&s.saleType===t?"selected":""}>${t}</option>`).join("")}</select></div>
      <div style="grid-column:1/-1"><label>Sales Person (CA)</label><select id="f_cp" onchange="onCpPick()">${rosterOpts}</select></div>
      <div><label>Team Leader</label><input class="inp" id="f_tl" value="${s?esc(s.tl):""}" readonly style="background:#f0f3f8"></div>
      <div><label>Location</label><input class="inp" id="f_loc" value="${s?esc(s.loc):""}" readonly style="background:#f0f3f8"></div>
      <div style="grid-column:1/-1"><label>Customer Name</label><input class="inp" id="f_cust" value="${s?esc(s.customer):""}" placeholder="Customer full name"></div>
      <div><label>Customer Phone</label><input class="inp" id="f_phone" value="${s?esc(s.phone):""}" placeholder="10-digit mobile"></div>
      <div><label>Chassis No</label><input class="inp" id="f_chassis" value="${s?esc(s.chassis):""}" placeholder="MAT…"></div>
      <div><label>Acc. Work No</label><input class="inp" id="f_accw" value="${s?esc(s.accWork):""}"></div>
      <div><label>Book No</label><input class="inp" id="f_book" value="${s?esc(s.bookNo):""}"></div>
      <div><label>Accessories Paid (₹)</label><input class="inp" id="f_paid" type="number" min="0" value="${s?s.paid:0}" oninput="onPaidChange()"></div>
      <div><label>FOC Value (₹)</label><input class="inp" id="f_foc" type="number" min="0" value="${s?s.foc:0}"></div>
      <div><label>Extended Warranty?</label><select id="f_ew"><option value="">No</option><option value="1" ${s&&s.ew?"selected":""}>Yes</option></select></div>
    </div>
    <div id="zeroBlock" class="ff" style="margin-top:14px;${(s&&s.zero)?'':'display:none'}">
      <div class="section-note" style="background:var(--bad-soft);border-color:#f3c4c9;color:var(--bad)">
        ⚠️ Paid = ₹0 → this is a <b>Zero Car</b>. Select why no accessories were sold:</div>
      <select id="f_zr">${ZERO_REASONS.map(r=>`<option ${s&&s.zeroReason===r?"selected":""}>${r}</option>`).join("")}</select>
    </div>
  `,[
    {label:"Cancel",cls:"ghost",fn:closeModal},
    {label:(s?"Save changes":"Add delivery"),cls:"",fn:()=>saveSale(id)}
  ]);
  if(!s) onCpPick();
}

export function onCpPick(){
  const sel = document.querySelector("#f_cp");
  const o = sel.options[sel.selectedIndex];
  document.querySelector("#f_tl").value = o.dataset.tl||"";
  document.querySelector("#f_loc").value = o.dataset.loc||"";
}

export function onPaidChange(){
  const p = +document.querySelector("#f_paid").value||0;
  document.querySelector("#zeroBlock").style.display = (p===0) ? "block" : "none";
}

export async function saveSale(id){
  const g = x => document.querySelector("#"+x).value;
  const paid = +g("f_paid")||0, foc = +g("f_foc")||0;
  if(!g("f_cust").trim()){ toast("Customer name is required","bad"); return; }
  const zero = paid===0;
  const rec = { id:id||uid(), date:g("f_date"), model:g("f_model"), saleType:g("f_type"),
    cp:g("f_cp"), tl:g("f_tl"), loc:g("f_loc"), customer:g("f_cust").trim(), phone:g("f_phone").trim(),
    chassis:g("f_chassis").trim(), accWork:g("f_accw").trim(), bookNo:g("f_book").trim(),
    paid, foc, total:paid+foc, ew:!!g("f_ew"), zero, zeroReason: zero? g("f_zr"):"" };
  try{
    const saved = id ? await api("/sales/"+id,{method:"PUT",body:rec})
                     : await api("/sales",{method:"POST",body:rec});
    if(id){ const i=app.DB.sales.findIndex(x=>x.id===id); app.DB.sales[i]=saved; }
    else app.DB.sales.unshift(saved);
  }catch(e){ toast(e.message,"bad"); return; }
  closeModal(); renderSales(); buildNav();
  toast(id?"Delivery updated":"Delivery added"+(zero?" · flagged ZERO":""), zero?"":"ok");
}
