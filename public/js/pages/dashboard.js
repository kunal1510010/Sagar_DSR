import { app, can, monthSales, agg, groupBy, attendanceToday } from '../state.js';
import { esc, fmtINR, fmtN } from '../utils.js';
import { monthPicker, locFilterCtl } from '../nav.js';

export function renderDash(){
  const rows = monthSales(); const a = agg(rows);
  const teams = groupBy(rows,"tl");
  const redZone = Object.entries(teams).map(([tl,rs])=>({tl,...agg(rs)}))
    .filter(t=>t.zeroPct>=40 && t.cars>=3).sort((x,y)=>y.zeroPct-x.zeroPct);
  const topCA = Object.entries(groupBy(rows,"cp")).map(([cp,rs])=>({cp,...agg(rs)}))
    .sort((x,y)=>y.paid-x.paid).slice(0,6);
  const byLoc = Object.entries(groupBy(rows,"loc")).map(([loc,rs])=>({loc,...agg(rs)})).sort((x,y)=>y.paid-x.paid);
  const att = attendanceToday();

  document.querySelector("#view").innerHTML=`
  <div class="toolbar">
    ${monthPicker()} ${locFilterCtl()}
    <div class="spacer"></div>
    ${can.enterSales()?`<button class="btn sm" onclick="go('sales');setTimeout(openSaleForm,80)">+ New Sale Entry</button>`:""}
  </div>

  <div class="grid cards" style="margin-bottom:16px">
    <div class="kpi"><div class="lab">Cars Delivered</div><div class="val">${a.cars}</div><div class="sub">this month</div></div>
    <div class="kpi ok"><div class="lab">Accessories Paid</div><div class="val">${fmtINR(a.paid)}</div><div class="sub">+ ${fmtINR(a.foc)} FOC</div></div>
    <div class="kpi"><div class="lab">Paid / Car</div><div class="val">${fmtINR(a.paidPerCar)}</div><div class="sub">average revenue</div></div>
    <div class="kpi bad"><div class="lab">Zero Cars</div><div class="val">${a.zero}</div><div class="sub">${fmtN(a.zeroPct)}% of deliveries</div></div>
    <div class="kpi warn"><div class="lab">Extended Warranty</div><div class="val">${a.ew}</div><div class="sub">EW attached</div></div>
    <div class="kpi"><div class="lab">Present Today</div><div class="val">${att.present}/${att.total}</div><div class="sub">${att.total?fmtN(att.present/att.total*100):0}% attendance</div></div>
  </div>

  <div class="row2">
    <div class="panel">
      <div class="ph"><h3>Sales by Location</h3></div>
      <div class="pb flush"><div class="tblwrap"><table>
        <thead><tr><th>Location</th><th>Cars</th><th>Paid</th><th>Paid/Car</th><th>Zero %</th></tr></thead>
        <tbody>${byLoc.length?byLoc.map(l=>`<tr>
          <td><b>${esc(l.loc)}</b></td><td class="num">${l.cars}</td>
          <td class="num">${fmtINR(l.paid)}</td><td class="num">${fmtINR(l.paidPerCar)}</td>
          <td><div style="display:flex;align-items:center;gap:8px"><div class="bar"><i class="${l.zeroPct>=40?'bad':l.zeroPct>=20?'warn':'ok'}" style="width:${Math.min(l.zeroPct,100)}%"></i></div><span class="num">${fmtN(l.zeroPct)}%</span></div></td>
        </tr>`).join(""):`<tr><td colspan=5 class="empty"><b>No sales yet</b>Add entries under Daily Sales</td></tr>`}</tbody>
      </table></div></div>
    </div>
    <div class="panel">
      <div class="ph"><h3>🔴 Red-Zone Teams</h3><div class="ph-r"><span class="tag bad">≥40% zero cars</span></div></div>
      <div class="pb flush"><div class="tblwrap"><table>
        <thead><tr><th>Team Leader</th><th>Cars</th><th>Zero</th><th>Zero %</th></tr></thead>
        <tbody>${redZone.length?redZone.map(t=>`<tr>
          <td><b>${esc(t.tl)}</b></td><td class="num">${t.cars}</td><td class="num">${t.zero}</td>
          <td><span class="tag bad">${fmtN(t.zeroPct)}%</span></td></tr>`).join("")
          :`<tr><td colspan=4 class="empty"><b>No red-zone teams 🎉</b>All teams under the 40% threshold</td></tr>`}</tbody>
      </table></div></div>
    </div>
  </div>

  <div class="panel" style="margin-top:16px">
    <div class="ph"><h3>Top Performers (Paid Accessories)</h3></div>
    <div class="pb flush"><div class="tblwrap"><table>
      <thead><tr><th>#</th><th>Sales Person (CA)</th><th>Cars</th><th>Paid</th><th>Paid/Car</th><th>Zero</th></tr></thead>
      <tbody>${topCA.length?topCA.map((c,i)=>`<tr>
        <td><span class="tag ${i===0?'pri':'gray'}">${i+1}</span></td>
        <td><b>${esc(c.cp)}</b></td><td class="num">${c.cars}</td>
        <td class="num">${fmtINR(c.paid)}</td><td class="num">${fmtINR(c.paidPerCar)}</td>
        <td class="num">${c.zero}</td></tr>`).join(""):`<tr><td colspan=6 class="empty">No data</td></tr>`}</tbody>
    </table></div></div>
  </div>`;
}
