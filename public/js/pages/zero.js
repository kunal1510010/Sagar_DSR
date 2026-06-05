import { monthSales, agg, groupBy } from '../state.js';
import { esc, fmtINR, fmtN } from '../utils.js';
import { monthPicker, locFilterCtl } from '../nav.js';
import { toast } from '../utils.js';

export function renderZero(){
  const rows = monthSales();
  const zeros = rows.filter(s=>s.zero).sort((a,b)=>b.date.localeCompare(a.date));
  const byCP = Object.entries(groupBy(rows,"cp")).map(([cp,rs])=>{const a=agg(rs);return{cp,tl:rs[0].tl,loc:rs[0].loc,...a};});
  const red = byCP.filter(c=>c.cars>=3 && (c.zeroPct>=40 || c.paid===0)).sort((x,y)=>y.zeroPct-x.zeroPct);
  const reasonCount = {}; zeros.forEach(z=>reasonCount[z.zeroReason||"—"]=(reasonCount[z.zeroReason||"—"]||0)+1);
  const reasons = Object.entries(reasonCount).sort((a,b)=>b[1]-a[1]);

  document.querySelector("#view").innerHTML=`
  <div class="toolbar">${monthPicker()} ${locFilterCtl()}<div class="spacer"></div>
    <span class="pill bad" style="background:var(--bad-soft);color:var(--bad);border-color:#f3c4c9">${zeros.length} zero cars · ${red.length} red-zone CAs</span></div>

  <div class="row2" style="margin-bottom:16px">
    <div class="panel">
      <div class="ph"><h3>🔴 Red-Zone Salespersons</h3><div class="ph-r"><span class="tag bad">≥40% zero OR ₹0 paid</span></div></div>
      <div class="pb flush"><div class="tblwrap"><table>
        <thead><tr><th>Sales Person</th><th>Team Leader</th><th>Cars</th><th>Zero</th><th>Zero %</th><th>Paid</th><th></th></tr></thead>
        <tbody>${red.length?red.map(c=>`<tr>
          <td><b>${esc(c.cp)}</b><div style="font-size:11px;color:var(--faint)">${esc(c.loc)}</div></td>
          <td>${esc(c.tl)}</td><td class="num">${c.cars}</td><td class="num">${c.zero}</td>
          <td><span class="tag bad">${fmtN(c.zeroPct)}%</span></td><td class="num">${fmtINR(c.paid)}</td>
          <td><button class="btn tiny ghost" onclick="coachCA('${esc(c.cp)}')">Nudge</button></td>
        </tr>`).join(""):`<tr><td colspan=7 class="empty"><b>No red-zone salespersons 🎉</b>Everyone is converting accessories</td></tr>`}</tbody>
      </table></div></div>
    </div>
    <div class="panel">
      <div class="ph"><h3>Why Zero — Reason Breakdown</h3></div>
      <div class="pb">${reasons.length?reasons.map(([r,n])=>`
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:11px">
          <div style="width:170px;font-size:13px">${esc(r)}</div>
          <div class="bar" style="flex:1"><i class="bad" style="width:${n/zeros.length*100}%"></i></div>
          <b class="num" style="width:30px;text-align:right">${n}</b></div>`).join(""):`<div class="empty">No zero cars 🎉</div>`}</div>
    </div>
  </div>

  <div class="panel">
    <div class="ph"><h3>All Zero Cars</h3><div class="ph-r"><span class="tag gray">${zeros.length} cars with ₹0 accessories</span></div></div>
    <div class="pb flush"><div class="tblwrap"><table>
      <thead><tr><th>Date</th><th>Loc</th><th>Model</th><th>Customer</th><th>CA</th><th>Team Leader</th><th>Reason</th><th></th></tr></thead>
      <tbody>${zeros.length?zeros.map(s=>`<tr>
        <td class="num">${s.date.slice(8)}/${s.date.slice(5,7)}</td><td>${esc(s.loc)}</td><td>${esc(s.model)}</td>
        <td><b>${esc(s.customer)}</b></td><td>${esc(s.cp)}</td><td>${esc(s.tl)}</td>
        <td><span class="tag warn">${esc(s.zeroReason||"—")}</span></td>
        <td><button class="btn tiny ghost" onclick="quickOffer('${s.id}')">💬 Offer</button></td>
      </tr>`).join(""):`<tr><td colspan=8 class="empty"><b>No zero cars this month 🎉</b></td></tr>`}</tbody>
    </table></div></div>
  </div>`;
}

export function coachCA(cp){
  toast("Tip: review "+cp+"'s zero cars with their TL in the next huddle.","");
}
