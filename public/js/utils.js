export const $ = s => document.querySelector(s);
export const $$ = s => document.querySelectorAll(s);

export const fmtINR = n => "₹" + (Math.round(n||0)).toLocaleString("en-IN");
export const fmtN = n => (Math.round((n||0)*100)/100).toLocaleString("en-IN");
export const today = () => new Date().toISOString().slice(0,10);
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
export const esc = s => (s==null?"":String(s)).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

export function initials(n){ return (n||"?").split(/\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase(); }
export function monthKey(d){ return (d||today()).slice(0,7); }

export function toast(msg, kind){
  const t = document.createElement("div");
  t.className = "toast" + (kind ? " "+kind : "");
  t.innerHTML = (kind==="ok"?"✓ ":kind==="bad"?"✕ ":"") + esc(msg);
  document.querySelector("#toasts").appendChild(t);
  setTimeout(()=>t.remove(), 3200);
}

export function downloadText(txt, name){
  const b = new Blob([txt], {type:"text/csv"});
  const u = URL.createObjectURL(b);
  const a = document.createElement("a");
  a.href = u; a.download = name; a.click();
  URL.revokeObjectURL(u);
}
