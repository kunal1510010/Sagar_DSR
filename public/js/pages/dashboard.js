import { app, can, monthSales, agg, groupBy, attendanceToday } from '../state.js';
import { esc, fmtINR, fmtN } from '../utils.js';
import { monthPicker, locFilterCtl } from '../nav.js';

export function renderDash(){
  const rows = monthSales(); const a = agg(rows);
  const teams = groupBy(rows,"tl");
  const redZone = Object.entries(teams).map(([tl,rs])=>({tl,...agg(rs)}))
    .filter(t=>t.zeroPct>=40 && t.cars>=3).sort((x,y)=>y.zeroPct-x.zeroPct);
  const topTL = Object.entries(groupBy(rows,"tl")).map(([tl,rs])=>({tl,...agg(rs)}))
    .sort((x,y)=>y.paid-x.paid);
  const byLoc = Object.entries(groupBy(rows,"loc")).map(([loc,rs])=>({loc,...agg(rs)})).sort((x,y)=>y.paid-x.paid);
  const att = attendanceToday();

  document.querySelector("#view").innerHTML=`
  <div class="toolbar">
    ${monthPicker()} ${locFilterCtl()}
    <div class="spacer"></div>
    ${can.enterSales()?`<button class="btn sm" onclick="go('sales');setTimeout(openSaleForm,80)">+ New Sale Entry</button>`:""}
  </div>

  <div class="grid cards" style="margin-bottom:16px;grid-template-columns:repeat(7,1fr)">
    <div class="kpi"><div class="lab">Cars Delivered</div><div class="val">${a.cars}</div><div class="sub">this month</div></div>
    <div class="kpi ok"><div class="lab">Accessories Paid</div><div class="val">${fmtINR(a.paid)}</div><div class="sub">+ ${fmtINR(a.foc)} FOC</div></div>
    <div class="kpi"><div class="lab">Paid / Car</div><div class="val">${fmtINR(a.paidPerCar)}</div><div class="sub">average revenue</div></div>
    <div class="kpi bad"><div class="lab">Zero Cars</div><div class="val">${a.zero}</div><div class="sub">${fmtN(a.zeroPct)}% of deliveries</div></div>
    <div class="kpi warn"><div class="lab">Extended Warranty</div><div class="val">${a.ew}</div><div class="sub">EW attached</div></div>
    <div class="kpi ok"><div class="lab">VAS Billing</div><div class="val">${fmtINR(a.vasBilling)}</div><div class="sub">value-added services</div></div>
    <div class="kpi"><div class="lab">Ceramic Coating</div><div class="val">${a.ceramic}</div><div class="sub">cars this month</div></div>
  </div>

  <div class="panel" style="margin-bottom:16px">
    <div class="ph"><h3>Sales by Location</h3></div>
    <div class="pb flush"><div class="tblwrap"><table>
      <thead><tr><th>#</th><th>Location</th><th>Cars</th><th>Paid</th><th>Total FOC</th><th>EW</th><th>VAS Amount</th><th>Ceramic</th><th>Paid/Car</th></tr></thead>
      <tbody>${byLoc.length?byLoc.map((l,i)=>`<tr>
        <td><span class="tag ${i===0?'pri':'gray'}">${i+1}</span></td>
        <td><b>${esc(l.loc)}</b></td><td class="num">${l.cars}</td>
        <td class="num">${fmtINR(l.paid)}</td>
        <td class="num">${l.foc?fmtINR(l.foc):"—"}</td>
        <td class="num">${l.ew||"—"}</td>
        <td class="num">${l.vasBilling?fmtINR(l.vasBilling):"—"}</td>
        <td class="num">${l.ceramic||"—"}</td>
        <td class="num">${fmtINR(l.paidPerCar)}</td>
      </tr>`).join(""):`<tr><td colspan=9 class="empty"><b>No sales yet</b>Add entries under Daily Sales</td></tr>`}</tbody>
    </table></div></div>
  </div>

  <div class="panel" style="margin-top:16px">
    <div class="ph"><h3>Team Leader Performance</h3></div>
    <div class="pb flush"><div class="tblwrap"><table>
      <thead><tr><th>#</th><th>Team Leader</th><th>Cars</th><th>Paid</th><th>Total FOC</th><th>EW</th><th>VAS Amount</th><th>Ceramic</th><th>Paid/Car</th></tr></thead>
      <tbody>${topTL.length?topTL.map((t,i)=>`<tr>
        <td><span class="tag ${i===0?'pri':'gray'}">${i+1}</span></td>
        <td><b>${esc(t.tl)}</b></td><td class="num">${t.cars}</td>
        <td class="num">${fmtINR(t.paid)}</td>
        <td class="num">${t.foc?fmtINR(t.foc):"—"}</td>
        <td class="num">${t.ew||"—"}</td>
        <td class="num">${t.vasBilling?fmtINR(t.vasBilling):"—"}</td>
        <td class="num">${t.ceramic||"—"}</td>
        <td class="num">${fmtINR(t.paidPerCar)}</td>
      </tr>`).join(""):`<tr><td colspan=9 class="empty">No data</td></tr>`}</tbody>
    </table></div></div>
  </div>`;
}
