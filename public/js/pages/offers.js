import { app, monthSales } from '../state.js';
import { esc, uid } from '../utils.js';
import { api } from '../api.js';
import { modal, closeModal } from '../modal.js';
import { go } from '../nav.js';
import { toast } from '../utils.js';

export function renderOffers(){
  const rows = monthSales().filter(s=>s.phone);
  app.offerSel = app.offerSel || (app.DB.offers[0] && app.DB.offers[0].id);
  document.querySelector("#view").innerHTML=`
  <div class="section-note">
    <svg width="18" height="18" viewBox="0 0 18 18"><path d="M2 4h14v9H7l-4 3v-3H2z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
    <div>Compose an offer once, pick customers, and fire it off with one click. <b>{name}</b> and <b>{model}</b> auto-fill per customer. Attach a brochure/price-list PDF by pasting its link — it rides along in the message.</div>
  </div>
  <div class="row2">
    <div class="panel">
      <div class="ph"><h3>Offer Templates</h3><div class="ph-r"><button class="btn tiny" onclick="openOfferForm()">+ New</button></div></div>
      <div class="pb flush">${app.DB.offers.map(o=>`
        <div onclick="app.offerSel='${o.id}';renderOffers()" style="padding:14px 18px;border-bottom:1px solid #eef2f8;cursor:pointer;${app.offerSel===o.id?'background:var(--pri-soft)':''}">
          <div style="display:flex;align-items:center;gap:8px">
            <b style="${app.offerSel===o.id?'color:var(--pri-d)':''}">${esc(o.title)}</b>
            ${o.pdf?'<span class="tag pri">📎 PDF</span>':''}
            <button class="btn tiny ghost" style="margin-left:auto" onclick="event.stopPropagation();openOfferForm('${o.id}')">Edit</button>
          </div>
          <div style="font-size:12.5px;color:var(--muted);margin-top:5px">${esc(o.body.slice(0,90))}…</div>
        </div>`).join("")}</div>
    </div>
    <div class="panel" id="offerSend"></div>
  </div>
  <div class="panel" style="margin-top:16px">
    <div class="ph"><h3>Pick Customers (delivered this month)</h3>
      <div class="ph-r"><button class="btn tiny ghost" onclick="toggleAllTargets()">Select all</button>
        <span class="tag gray" id="selCount">0 selected</span></div></div>
    <div class="pb flush"><div class="tblwrap"><table>
      <thead><tr><th style="width:40px"></th><th>Customer</th><th>Model</th><th>Phone</th><th>CA</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows.length?rows.map(s=>`<tr>
        <td><input type="checkbox" onchange="toggleTarget('${s.id}',this.checked)" ${app.offerTargets.includes(s.id)?'checked':''}></td>
        <td><b>${esc(s.customer)}</b></td><td>${esc(s.model)}</td><td class="num">${esc(s.phone)}</td><td>${esc(s.cp)}</td>
        <td>${s.zero?'<span class="tag bad">ZERO</span>':'<span class="tag ok">OK</span>'}</td>
        <td><button class="btn tiny" onclick="sendOne('${s.id}')">💬 Send</button></td>
      </tr>`).join(""):`<tr><td colspan=7 class="empty">No customers with phone numbers yet</td></tr>`}</tbody>
    </table></div></div>
  </div>`;
  renderOfferSend();
}

export function renderOfferSend(){
  const o = app.DB.offers.find(x=>x.id===app.offerSel);
  if(!o){ document.querySelector("#offerSend").innerHTML=""; return; }
  const preview = o.body.replace(/{name}/g,"Customer").replace(/{model}/g,"your TATA");
  document.querySelector("#offerSend").innerHTML=`
    <div class="ph"><h3>Send: ${esc(o.title)}</h3></div>
    <div class="pb">
      <div style="background:#e7ffe2;border:1px solid #b9e8ad;border-radius:14px;border-bottom-right-radius:4px;padding:13px 15px;font-size:13.5px;white-space:pre-wrap">${esc(preview)}${o.pdf?`\n\n📎 ${esc(o.pdf)}`:""}</div>
      <div class="ff" style="margin-top:14px">
        <label>Or send to a single number now</label>
        <div style="display:flex;gap:8px">
          <input class="inp" id="oneNum" placeholder="10-digit mobile" style="flex:1">
          <button class="btn" onclick="sendManual()">WhatsApp</button>
          <button class="btn gray" onclick="sendManual('sms')">SMS</button>
        </div>
        <div class="help">Selecting customers below and clicking "Send" opens WhatsApp per customer with the message pre-filled.</div>
      </div>
      <div style="margin-top:14px;display:flex;gap:8px">
        <button class="btn full" onclick="sendBatch()">💬 Send to selected (${app.offerTargets.length})</button>
      </div>
    </div>`;
}

function waLink(num, text){ const n=(num||"").replace(/\D/g,""); const p=n.length===10?"91"+n:n; return `https://wa.me/${p}?text=${encodeURIComponent(text)}`; }
function smsLink(num, text){ return `sms:${(num||"").replace(/[^\d+]/g,"")}?&body=${encodeURIComponent(text)}`; }
function buildMsg(o, s){ let t=o.body.replace(/{name}/g,s?s.customer:"Customer").replace(/{model}/g,s?s.model:"your TATA"); if(o.pdf) t+="\n\n📎 "+o.pdf; return t; }

export function sendOne(saleId){
  const s = app.DB.sales.find(x=>x.id===saleId);
  const o = app.DB.offers.find(x=>x.id===app.offerSel);
  if(!o){ toast("Pick an offer template first","bad"); return; }
  window.open(waLink(s.phone, buildMsg(o,s)), "_blank");
  toast("Opening WhatsApp for "+s.customer,"ok");
}

export function sendManual(mode){
  const o = app.DB.offers.find(x=>x.id===app.offerSel);
  const num = document.querySelector("#oneNum").value.trim();
  if(!num){ toast("Enter a number","bad"); return; }
  const link = mode==="sms" ? smsLink(num,buildMsg(o,null)) : waLink(num,buildMsg(o,null));
  window.open(link,"_blank"); toast("Opening "+(mode==="sms"?"SMS":"WhatsApp"),"ok");
}

export function sendBatch(){
  const o = app.DB.offers.find(x=>x.id===app.offerSel);
  if(!app.offerTargets.length){ toast("Select at least one customer","bad"); return; }
  app.offerTargets.forEach((id,i)=>{
    const s = app.DB.sales.find(x=>x.id===id);
    setTimeout(()=>window.open(waLink(s.phone,buildMsg(o,s)),"_blank"), i*400);
  });
  toast("Opening WhatsApp for "+app.offerTargets.length+" customers","ok");
}

export function toggleTarget(id, on){
  app.offerTargets = app.offerTargets.filter(x=>x!==id);
  if(on) app.offerTargets.push(id);
  document.querySelector("#selCount").textContent = app.offerTargets.length+" selected";
  renderOfferSend();
}

export function toggleAllTargets(){
  const rows = monthSales().filter(s=>s.phone);
  app.offerTargets = app.offerTargets.length===rows.length ? [] : rows.map(s=>s.id);
  renderOffers();
}

export function quickOffer(saleId){
  go("offers");
  setTimeout(()=>{ app.offerTargets=[saleId]; renderOffers(); }, 60);
}

export function openOfferForm(id){
  const o = id ? app.DB.offers.find(x=>x.id===id) : null;
  modal(`${o?"Edit":"New"} Offer Template`,`
    <div class="ff">
      <label>Offer Title</label><input class="inp" id="o_title" value="${o?esc(o.title):""}" placeholder="e.g. Festive Accessories Sale">
      <label style="margin-top:12px">Message <span style="font-weight:400;color:var(--faint)">— use {name} and {model} as placeholders</span></label>
      <textarea id="o_body" style="min-height:120px">${o?esc(o.body):"Dear {name}, special offer on your {model}…"}</textarea>
      <label style="margin-top:12px">PDF / Brochure link (optional)</label>
      <input class="inp" id="o_pdf" value="${o?esc(o.pdf):""}" placeholder="https://…/pricelist.pdf">
      <div class="help">Paste a hosted link to a brochure, price list or offer PDF. It is appended to the message so the customer can tap and view it.</div>
    </div>`,[
    o?{label:"Delete",cls:"danger",fn:async()=>{
      try{await api("/offers/"+id,{method:"DELETE"});}catch(e){toast(e.message,"bad");return;}
      app.DB.offers=app.DB.offers.filter(x=>x.id!==id);
      closeModal(); app.offerSel=app.DB.offers[0]&&app.DB.offers[0].id;
      renderOffers(); toast("Offer deleted","ok");
    }}:null,
    {label:"Cancel",cls:"ghost",fn:closeModal},
    {label:o?"Save":"Create",cls:"",fn:async()=>{
      const rec={id:id||uid(),title:document.querySelector("#o_title").value.trim()||"Untitled offer",body:document.querySelector("#o_body").value,pdf:document.querySelector("#o_pdf").value.trim()};
      try{
        if(id){ await api("/offers/"+id,{method:"PUT",body:rec}); const i=app.DB.offers.findIndex(x=>x.id===id); app.DB.offers[i]=rec; }
        else { const saved=await api("/offers",{method:"POST",body:rec}); rec.id=saved.id; app.DB.offers.push(rec); }
      }catch(e){toast(e.message,"bad");return;}
      app.offerSel=rec.id; closeModal(); renderOffers(); toast("Offer saved","ok");
    }}
  ].filter(Boolean));
}
