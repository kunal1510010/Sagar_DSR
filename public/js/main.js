import { app } from './state.js';
import { esc, initials, monthKey, today } from './utils.js';
import { api, loadBootstrap } from './api.js';
import { closeModal } from './modal.js';
import { go, buildNav, registerRenderer, monthLabel, setLoc, setMonth } from './nav.js';

import { renderDash }     from './pages/dashboard.js';
import { renderSales, renderSalesTable, openSaleForm, onCpPick, onPaidChange, saveSale } from './pages/sales.js';
import { renderStock, renderStockTbl, openStockForm, onKind, saveStock }                 from './pages/stock.js';
import { renderAttend, statusColor, mark, markAll }                                       from './pages/attendance.js';
import { renderReports, renderRepTable, exportReport }                                    from './pages/reports.js';
import { renderZero, coachCA }                                                             from './pages/zero.js';
import { renderOffers, renderOfferSend, openOfferForm, sendOne, sendManual, sendBatch, toggleTarget, toggleAllTargets, quickOffer } from './pages/offers.js';
import { renderRoster, openRosterForm, delRoster, importRoster }                         from './pages/roster.js';
import { renderUsers, openUserForm, userScope, delUser }                                  from './pages/users.js';

/* ---------- register page renderers ---------- */
registerRenderer('dash',    renderDash);
registerRenderer('sales',   renderSales);
registerRenderer('stock',   renderStock);
registerRenderer('attend',  renderAttend);
registerRenderer('reports', renderReports);
registerRenderer('zero',    renderZero);
registerRenderer('offers',  renderOffers);
registerRenderer('roster',  renderRoster);
registerRenderer('users',   renderUsers);

/* ---------- expose everything that inline HTML calls ---------- */
// shared state object — inline handlers like app.attDate=... work via this
window.app = app;

// nav
window.go        = go;
window.setLoc    = setLoc;
window.setMonth  = setMonth;

// auth
window.fill   = fill;
window.doLogin  = doLogin;
window.logout   = logout;

// modal
window.closeModal = closeModal;

// sales
window.renderSalesTable = renderSalesTable;
window.openSaleForm     = openSaleForm;
window.onCpPick         = onCpPick;
window.onPaidChange     = onPaidChange;

// stock
window.renderStockTbl = renderStockTbl;
window.openStockForm  = openStockForm;
window.onKind         = onKind;

// attendance
window.renderAttend = renderAttend;
window.mark         = mark;
window.markAll      = markAll;

// reports
window.renderReports  = renderReports;
window.exportReport   = exportReport;

// zero
window.coachCA   = coachCA;
window.quickOffer = quickOffer;

// offers
window.renderOffers      = renderOffers;
window.openOfferForm     = openOfferForm;
window.sendOne           = sendOne;
window.sendManual        = sendManual;
window.sendBatch         = sendBatch;
window.toggleTarget      = toggleTarget;
window.toggleAllTargets  = toggleAllTargets;

// roster
window.renderRoster   = renderRoster;
window.openRosterForm = openRosterForm;
window.delRoster      = delRoster;
window.importRoster   = importRoster;

// users
window.renderUsers   = renderUsers;
window.openUserForm  = openUserForm;
window.userScope     = userScope;
window.delUser       = delUser;

/* =====================================================================
   AUTH
   ===================================================================== */
function fill(u, p){
  document.querySelector("#lu").value = u;
  document.querySelector("#lp").value = p;
}

async function startSession(user){
  app.ME = user;
  app.LOCF = (user.role==="admin") ? "All" : (user.loc||"All");
  app.CURMONTH = monthKey(today());
  await loadBootstrap();
  document.querySelector("#login").classList.add("hide");
  document.querySelector("#app").classList.remove("hide");
  document.querySelector("#unm").textContent  = user.name;
  document.querySelector("#uav").textContent  = initials(user.name);
  document.querySelector("#url").textContent  = {admin:"Manager · Admin",tl:"Team Leader",sales:"Sales / CA"}[user.role];
  document.querySelector("#period").textContent = monthLabel(app.CURMONTH);
  buildNav(); go("dash");
}

async function doLogin(){
  const u = document.querySelector("#lu").value.trim().toLowerCase();
  const p = document.querySelector("#lp").value.trim();
  document.querySelector("#lerr").textContent = "Signing in…";
  try{
    const {token, user} = await api("/login",{method:"POST",body:{username:u, pin:p}});
    app.TOKEN = token;
    localStorage.setItem("sm_token", token);
    document.querySelector("#lerr").textContent = "";
    await startSession(user);
  }catch(e){
    document.querySelector("#lerr").textContent = e.message || "Invalid username or PIN. Try a demo account below.";
  }
}

async function tryResume(){
  if(!app.TOKEN) return;
  try{ const {user} = await api("/me"); await startSession(user); }
  catch(e){ app.TOKEN=null; localStorage.removeItem("sm_token"); }
}

function logout(){
  app.ME = null; app.TOKEN = null;
  localStorage.removeItem("sm_token");
  document.querySelector("#app").classList.add("hide");
  document.querySelector("#login").classList.remove("hide");
  document.querySelector("#lp").value = "";
}

/* ---------- init ---------- */
window.addEventListener("keydown", e => {
  if(e.key==="Enter" && !document.querySelector("#login").classList.contains("hide")) doLogin();
});
tryResume();
