import { app } from './state.js';
import { today } from './utils.js';

export async function api(path, opts={}){
  const headers = { "Content-Type":"application/json" };
  if(app.TOKEN) headers.Authorization = "Bearer " + app.TOKEN;
  const r = await fetch("/api"+path, { headers, ...opts,
    body: opts.body != null ? JSON.stringify(opts.body) : undefined });
  if(r.status===401){
    app.TOKEN = null;
    localStorage.removeItem("sm_token");
    throw new Error("Session expired — please sign in again.");
  }
  if(!r.ok){ let m="Request failed"; try{ m=(await r.json()).error||m; }catch(e){} throw new Error(m); }
  return r.status===204 ? null : r.json();
}

export async function loadBootstrap(){
  const b = await api("/bootstrap?month=" + app.CURMONTH);
  app.DB.roster = b.roster||[]; app.DB.sales = b.sales||[]; app.DB.stock = b.stock||[];
  app.DB.offers = b.offers||[]; app.DB.users = b.users||[];
  app.DB.attendance = []; app.TODAY_ATT.rows = b.todayAttendance||[];
}

export async function loadMonth(m){
  const [sales, stock] = await Promise.all([ api("/sales?month="+m), api("/stock?month="+m) ]);
  app.DB.sales = sales; app.DB.stock = stock;
}

export async function loadAttendance(date){
  app.DB.attendance = await api("/attendance?date="+date);
}

export async function refreshTodayAtt(){
  try{ app.TODAY_ATT.rows = await api("/attendance?date=" + today()); }catch(e){}
}
