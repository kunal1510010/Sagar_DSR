import { app } from './state.js';
import { visibleSales } from './state.js';
import { esc, monthKey, today } from './utils.js';
import { LOCATIONS } from './constants.js';
import { loadMonth } from './api.js';
import { toast } from './utils.js';

const _renderers = {};
export function registerRenderer(id, fn){ _renderers[id] = fn; }

export const NAV = [
  {grp:"Operations"},
  {id:"dash",    t:"Dashboard",           ico:"grid"},
  {id:"sales",   t:"Daily Sales Entry",   ico:"car",   need:()=>true},
  {id:"stock",   t:"Parts & Stock",       ico:"box",   need:()=>true},
  {id:"attend",  t:"Team Attendance",     ico:"user",  need:()=>true},
  {grp:"Insights"},
  {id:"reports", t:"CA & TL Reports",     ico:"chart"},
  {id:"zero",    t:"Zero Cars · Red Zone",ico:"alert"},
  {grp:"Engage"},
  {id:"offers",  t:"WhatsApp Offers",     ico:"chat"},
  {grp:"Admin",  need:()=>app.ME.role==="admin"},
  {id:"roster",  t:"Roster / Teams",      ico:"users", need:()=>app.ME.role==="admin"},
  {id:"users",   t:"User Accounts",       ico:"key",   need:()=>app.ME.role==="admin"},
];

const ICONS = {
  grid:'<rect x="2" y="2" width="6" height="6" rx="1.5"/><rect x="10" y="2" width="6" height="6" rx="1.5"/><rect x="2" y="10" width="6" height="6" rx="1.5"/><rect x="10" y="10" width="6" height="6" rx="1.5"/>',
  car:'<path d="M3 11l1.5-4A2 2 0 0 1 6.4 5.7h5.2a2 2 0 0 1 1.9 1.3L15 11M3 11h12v3a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-.5h-5V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  box:'<path d="M2 5l7-3 7 3v8l-7 3-7-3z M2 5l7 3 7-3 M9 8v8" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  user:'<circle cx="9" cy="6" r="3" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M3 16c0-3 3-5 6-5s6 2 6 5" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  chart:'<path d="M3 15V8 M8 15V4 M13 15v-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  alert:'<path d="M9 2l7 13H2z M9 7v4 M9 13v.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
  chat:'<path d="M2 4h14v9H7l-4 3v-3H2z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
  users:'<circle cx="7" cy="6" r="2.6" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M2 15c0-2.5 2.2-4 5-4s5 1.5 5 4" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M12 4.5a2.5 2.5 0 0 1 0 5M13 11c1.8.4 3 1.7 3 4" fill="none" stroke="currentColor" stroke-width="1.3"/>',
  key:'<circle cx="6" cy="9" r="3" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M9 9h7M14 9v3M16 9v2" stroke="currentColor" stroke-width="1.4"/>',
};

function svgIco(n){ return `<svg class="ico" viewBox="0 0 18 18" fill="currentColor">${ICONS[n]||""}</svg>`; }

export function buildNav(){
  const nav = document.querySelector("#nav");
  nav.innerHTML = "";
  NAV.forEach(item => {
    if(item.need && !item.need()) return;
    if(item.grp){
      const g = document.createElement("div");
      g.className = "grp"; g.textContent = item.grp;
      nav.appendChild(g); return;
    }
    const b = document.createElement("button");
    b.className = "navitem"; b.dataset.id = item.id;
    let badge = "";
    if(item.id==="zero"){ const z=visibleSales().filter(s=>s.zero).length; if(z) badge=`<span class="badge">${z}</span>`; }
    b.innerHTML = svgIco(item.ico) + `<span>${item.t}</span>` + badge;
    b.onclick = () => { go(item.id); document.getElementById('side').classList.remove('open'); };
    nav.appendChild(b);
  });
}

export function monthLabel(mk){
  const [y,m] = mk.split("-");
  return new Date(y, m-1, 1).toLocaleString("en-US", {month:"long", year:"numeric"});
}

export const PAGE_IDS = new Set(['dash','sales','stock','attend','reports','zero','offers','roster','users']);

export function go(id, {push=true}={}){
  app.PAGE = id;
  if(push) history.pushState({page:id}, '', '/'+id);
  document.querySelectorAll(".navitem").forEach(b => b.classList.toggle("active", b.dataset.id===id));
  const titles = {
    dash:    ["Dashboard",            "Group overview · "+monthLabel(app.CURMONTH)],
    sales:   ["Daily Sales Entry",    "Accessories sold on delivered cars"],
    stock:   ["Parts & Stock",        "Part purchase and stock transfer log"],
    attend:  ["Team Attendance",      "Daily attendance register"],
    reports: ["CA & TL Reports",      "Sales performance by team"],
    zero:    ["Zero Cars · Red Zone", "Cars delivered with no accessories"],
    offers:  ["WhatsApp Offers",      "One-click discount offers to customers"],
    roster:  ["Roster / Teams",       "Salespersons, team leaders & locations"],
    users:   ["User Accounts",        "Login access & roles"],
  };
  document.querySelector("#pgTitle").textContent = titles[id][0];
  document.querySelector("#pgCrumb").textContent = titles[id][1];
  document.querySelector("#locPill").innerHTML = "📍 <b>" + esc(app.LOCF==="All"?"All locations":app.LOCF) + "</b>";
  buildNav();
  if(_renderers[id]) _renderers[id]();
  window.scrollTo(0,0);
}

window.addEventListener('popstate', e => {
  if(!app.ME) return;
  const page = e.state?.page;
  go(PAGE_IDS.has(page) ? page : 'dash', {push: false});
});

export function locFilterCtl(){
  if(app.ME.role==="sales") return "";
  const opts = (app.ME.role==="admin"
    ? ["All",...LOCATIONS]
    : ["All",...new Set(app.DB.roster.filter(r=>r.tl===app.ME.tl).map(r=>r.loc))]);
  return `<select onchange="setLoc(this.value)">${opts.map(o=>`<option ${o===app.LOCF?"selected":""}>${esc(o)}</option>`).join("")}</select>`;
}

export function setLoc(v){ app.LOCF = v; go(app.PAGE); }

export function monthPicker(){
  const months = [];
  const d = new Date();
  for(let i=0; i<6; i++){
    const m = new Date(d.getFullYear(), d.getMonth()-i, 1);
    months.push(m.toISOString().slice(0,7));
  }
  return `<select onchange="setMonth(this.value)">${months.map(m=>`<option value="${m}" ${m===app.CURMONTH?"selected":""}>${monthLabel(m)}</option>`).join("")}</select>`;
}

export async function setMonth(m){
  app.CURMONTH = m;
  document.querySelector("#period").textContent = monthLabel(m);
  try{ await loadMonth(m); }catch(e){ toast(e.message,"bad"); }
  go(app.PAGE);
}
