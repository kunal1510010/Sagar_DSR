import { app, monthSales, agg, groupBy } from '../state.js';
import { esc, fmtINR, fmtN, downloadText } from '../utils.js';
import { TL_META } from '../constants.js';
import { monthPicker, locFilterCtl } from '../nav.js';
import { toast } from '../utils.js';

export function renderReports(){
  document.querySelector("#view").innerHTML=`
  <div class="toolbar">
    <div class="seg">
      <button class="${app.repTab==='ca'?'on':''}" onclick="app.repTab='ca';renderReports()">CA Wise</button>
      <button class="${app.repTab==='tl'?'on':''}" onclick="app.repTab='tl';renderReports()">Team-Leader Wise</button>
      <button class="${app.repTab==='model'?'on':''}" onclick="app.repTab='model';renderReports()">Model (PPL) Wise</button>
    </div>
    ${monthPicker()} ${locFilterCtl()}
    <div class="spacer"></div>
    <button class="btn sm ghost" onclick="exportReport()">⤓ Export CSV</button>
  </div>
  <div class="panel"><div class="pb flush" id="repTbl"></div></div>`;
  renderRepTable();
}

export function renderRepTable(){
  const rows = monthSales();
  let head, body, data;
  if(app.repTab==="ca"){
    data = Object.entries(groupBy(rows,"cp")).map(([cp,rs])=>{const a=agg(rs);const tl=rs[0].tl;const loc=rs[0].loc;return{name:cp,tl,loc,...a};})
      .sort((x,y)=>y.paid-x.paid);
    head = `<th>Sales Person</th><th>Team Leader</th><th>Loc</th><th>Cars</th><th>Paid</th><th>FOC</th><th>Paid/Car</th><th>EW</th><th>VAS Billing</th><th>Ceramic</th><th>Zero %</th>`;
    body = data.map(d=>rowFor(d,d.name,[d.tl,d.loc])).join("");
  } else if(app.repTab==="tl"){
    data = Object.entries(groupBy(rows,"tl")).map(([tl,rs])=>{const a=agg(rs);const loc=TL_META[tl]?TL_META[tl].loc:rs[0].loc;const team=new Set(rs.map(r=>r.cp)).size;return{name:tl,loc,team,...a};})
      .sort((x,y)=>y.paid-x.paid);
    head = `<th>Team Leader</th><th>Loc</th><th>Team Size</th><th>Cars</th><th>Paid</th><th>FOC</th><th>Paid/Car</th><th>EW</th><th>VAS Billing</th><th>Ceramic</th><th>Zero %</th>`;
    body = data.map(d=>`<tr><td><b>${esc(d.name)}</b></td><td>${esc(d.loc)}</td><td class="num">${d.team}</td>
      <td class="num">${d.cars}</td><td class="num">${fmtINR(d.paid)}</td><td class="num">${fmtINR(d.foc)}</td>
      <td class="num">${fmtINR(d.paidPerCar)}</td><td class="num">${d.ew}</td>
      <td class="num">${fmtINR(d.vasBilling)}</td><td class="num">${d.ceramic||"—"}</td>${zeroCell(d.zeroPct)}</tr>`).join("");
  } else {
    data = Object.entries(groupBy(rows,"model")).map(([m,rs])=>{const a=agg(rs);return{name:m,...a};})
      .sort((x,y)=>y.cars-x.cars);
    head = `<th>Model (PPL)</th><th>Cars</th><th>Paid</th><th>FOC</th><th>Paid/Car</th><th>VAS Billing</th><th>Ceramic</th><th>Zero %</th>`;
    body = data.map(d=>`<tr><td><b>${esc(d.name)}</b></td><td class="num">${d.cars}</td>
      <td class="num">${fmtINR(d.paid)}</td><td class="num">${fmtINR(d.foc)}</td>
      <td class="num">${fmtINR(d.paidPerCar)}</td><td class="num">${fmtINR(d.vasBilling)}</td>
      <td class="num">${d.ceramic||"—"}</td>${zeroCell(d.zeroPct)}</tr>`).join("");
  }
  window._repData = data;
  document.querySelector("#repTbl").innerHTML=`<div class="tblwrap"><table><thead><tr>${head}</tr></thead>
    <tbody>${body||`<tr><td colspan=9 class="empty">No data for this month/filter</td></tr>`}</tbody></table></div>`;
}

function rowFor(d, name, extra){
  return `<tr><td><b>${esc(name)}</b></td>${extra.map(e=>`<td>${esc(e)}</td>`).join("")}
    <td class="num">${d.cars}</td><td class="num">${fmtINR(d.paid)}</td><td class="num">${fmtINR(d.foc)}</td>
    <td class="num">${fmtINR(d.paidPerCar)}</td><td class="num">${d.ew}</td>
    <td class="num">${fmtINR(d.vasBilling)}</td><td class="num">${d.ceramic||"—"}</td>${zeroCell(d.zeroPct)}</tr>`;
}

function zeroCell(p){
  return `<td><span class="tag ${p>=40?'bad':p>=20?'warn':'ok'}">${fmtN(p)}%</span></td>`;
}

export function exportReport(){
  const d = window._repData||[];
  if(!d.length){ toast("Nothing to export","bad"); return; }
  const keys = Object.keys(d[0]);
  const csv = [keys.join(",")].concat(d.map(r=>keys.map(k=>`"${r[k]}"`).join(","))).join("\n");
  downloadText(csv, `report-${app.repTab}-${app.CURMONTH}.csv`);
  toast("CSV downloaded","ok");
}
