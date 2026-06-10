import { today, monthKey } from './utils.js';

export const app = {
  DB: { roster:[], sales:[], stock:[], attendance:[], offers:[], users:[] },
  ME: null,
  LOCF: "All",
  PAGE: "dash",
  TODAY_ATT: { rows: [] },
  CURMONTH: monthKey(today()),
  TOKEN: localStorage.getItem("sm_token") || null,
  OLDEST_MONTH: null,
  // page-level UI state
  salesSearch: "",
  stockTab: "all",
  repTab: "ca",
  attDate: today(),
  attDesigF: "",
  offerSel: null,
  offerTargets: [],
  rosterSearch: "",
};

export function visibleSales(){
  let r = app.DB.sales;
  if(app.ME.role==="tl") r = r.filter(s=>s.tl===app.ME.tl);
  if(app.ME.role==="sales") r = r.filter(s=>s.cp===app.ME.cp);
  if(app.LOCF!=="All") r = r.filter(s=>s.loc===app.LOCF);
  return r;
}

export function rosterForMe(){
  let r = app.DB.roster;
  if(app.ME.role==="tl") r = r.filter(x=>x.tl===app.ME.tl);
  if(app.LOCF!=="All") r = r.filter(x=>x.loc===app.LOCF);
  return r;
}

export const can = {
  manageRoster: () => app.ME.role==="admin",
  manageUsers:  () => app.ME.role==="admin",
  enterSales:   () => app.ME.role!=="sales",
  enterStock:   () => app.ME.role!=="sales",
  attendance:   () => true,
  allLocations: () => app.ME.role==="admin",
};

export function monthSales(){ return visibleSales().filter(s=>monthKey(s.date)===app.CURMONTH); }

export function agg(rows){
  let cars=rows.length, paid=0, foc=0, zero=0, ew=0, vasBilling=0, ceramic=0;
  rows.forEach(s=>{ paid+=+s.paid||0; foc+=+s.foc||0; vasBilling+=+s.vasBilling||0; if(s.zero)zero++; if(s.ew)ew++; if((s.vasName||"").split(",").map(x=>x.trim()).includes("Ceramic Coating"))ceramic++; });
  return {cars, paid, foc, total:paid+foc, zero, ew, vasBilling, ceramic, paidPerCar:cars?paid/cars:0, zeroPct:cars?zero/cars*100:0};
}

export function groupBy(rows, key){
  const m={};
  rows.forEach(r=>{ const k=r[key]||"—"; (m[k]=m[k]||[]).push(r); });
  return m;
}

export function attendanceToday(){
  const ros = rosterForMe();
  const present = ros.filter(r=>{
    const m = app.TODAY_ATT.rows.find(x=>x.code===r.code);
    return m && m.status==="Present";
  }).length;
  return { total:ros.length, present };
}
