import { esc } from './utils.js';

export function modal(title, bodyHTML, buttons){
  const bg = document.createElement("div");
  bg.className = "modal-bg";
  bg.innerHTML = `<div class="modal"><div class="mh"><h3>${esc(title)}</h3><button class="x" onclick="closeModal()">×</button></div>
    <div class="mb">${bodyHTML}</div><div class="mf" id="mfBtns"></div></div>`;
  bg.onclick = e => { if(e.target===bg) closeModal(); };
  document.querySelector("#modalRoot").appendChild(bg);
  const mf = bg.querySelector("#mfBtns");
  (buttons || [{label:"Close",cls:"",fn:closeModal}]).forEach(b => {
    const el = document.createElement("button");
    el.className = "btn " + (b.cls||"");
    el.textContent = b.label;
    el.onclick = b.fn;
    mf.appendChild(el);
  });
}

export function closeModal(){
  document.querySelector("#modalRoot").innerHTML = "";
}
