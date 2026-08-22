(() => {
  "use strict";
  const ADAPTER="https://cbknucemarcpbscirzyv.supabase.co/functions/v1/seitai-control-adapter";
  function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
  async function get(path){const r=await fetch(`${ADAPTER}${path}`,{cache:"no-store"});const d=await r.json().catch(()=>({}));return {status:r.status,data:d}}
  function mount(){
    const grid=document.querySelector("main .grid"); if(!grid||document.getElementById("productReadyCentralCard"))return;
    const card=document.createElement("div"); card.className="card span12"; card.id="productReadyCentralCard";
    card.innerHTML=`<h2>PRODUCT READY / CENTRAL V1.2</h2><p class="note">Worker・Database・Frontendの独立Version整合、LINE本人確認能力、スタッフ権限境界を読取専用で確認します。</p><div class="row" style="margin-top:12px"><button class="btn primary" id="productReadyCentralRun" type="button">PRODUCT READY確認</button><span class="status" id="productReadyCentralStatus">未確認</span></div><div class="jsonBox" id="productReadyCentralJson" style="margin-top:12px;min-height:160px">{}</div>`;
    grid.prepend(card);
    document.getElementById("productReadyCentralRun").addEventListener("click",run);
    run().catch(()=>{});
  }
  async function run(){
    const st=document.getElementById("productReadyCentralStatus"), box=document.getElementById("productReadyCentralJson"); st.textContent="確認中...";st.className="status warn";
    try{const [h,l,s]=await Promise.all([get("/health"),get("/line/capability"),get("/staff/capability")]); const ok=h.status===200&&h.data.ok===true&&h.data.versionsAligned===true&&l.status===200&&l.data.ok===true&&l.data.clientSuppliedIdentityAccepted===false&&s.status===200&&s.data.ok===true&&s.data.ownerMutationAuthority===false; const out={ok,health:h,line:l,staff:s};box.textContent=JSON.stringify(out,null,2);st.textContent=ok?"PRODUCT READY基盤 OK":"要確認";st.className=`status ${ok?"ok":"ng"}`;}catch(e){box.textContent=JSON.stringify({ok:false,error:e.message},null,2);st.textContent="要確認";st.className="status ng"}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
})();
