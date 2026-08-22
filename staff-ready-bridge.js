(() => {
  "use strict";
  const ADAPTER = "https://cbknucemarcpbscirzyv.supabase.co/functions/v1/seitai-control-adapter";
  const SESSION_KEY = "DPRO_SEITAI_STAFF_READY_SESSION";
  const nativeFetch = window.fetch.bind(window);
  let sessionPromise = null;
  const oldBase = String(window.DPRO_SEITAI_CONFIG?.apiBaseUrl || "https://dpro-seitai-line-api.dpromstk2000.workers.dev").replace(/\/+$/, "");
  function selectedStaff(){ return document.getElementById("staffSelect")?.value || ""; }
  function accessCode(){ try{return localStorage.getItem(window.DPRO_SEITAI_CONFIG?.adminCodeStorageKey || "DPRO_SEITAI_ADMIN_CODE") || ""}catch{return ""} }
  function shopCode(){ return window.DPRO_SEITAI_CONFIG?.shopCode || "dpro_seitai_demo"; }
  function loadSession(){ try{const x=JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null"); if(x?.token && x?.staff_code===selectedStaff()) return x}catch{} return null }
  function saveSession(x){ try{sessionStorage.setItem(SESSION_KEY,JSON.stringify(x))}catch{} }
  async function ensureSession(){
    const cached=loadSession(); if(cached) return cached;
    const staff=selectedStaff(), code=accessCode();
    if(!staff) throw new Error("スタッフを選択してください。");
    if(!code) throw new Error("スタッフアクセスコードを保存してください。");
    if(sessionPromise) return sessionPromise;
    sessionPromise=(async()=>{
      const r=await nativeFetch(`${ADAPTER}/staff/session`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({shop_code:shopCode(),staff_code:staff,access_code:code})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok||d.ok===false||!d.token) throw new Error(d.error||"スタッフ認証に失敗しました。");
      const x={token:d.token,staff_code:staff,session:d.session}; saveSession(x); return x;
    })();
    try{return await sessionPromise}finally{sessionPromise=null}
  }
  function response(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}})}
  window.fetch=async function(input,init={}){
    const url=new URL(typeof input==="string"?input:input.url,location.href);
    if(url.origin===new URL(oldBase).origin && url.pathname==="/api/owner/today"){
      try{const s=await ensureSession(); const q=new URLSearchParams(); if(url.searchParams.get("date"))q.set("date",url.searchParams.get("date")); const r=await nativeFetch(`${ADAPTER}/staff/today?${q}`,{headers:{Authorization:`Bearer ${s.token}`}}); return r}catch(e){return response({ok:false,error:e.message},403)}
    }
    if(url.origin===new URL(oldBase).origin && ["/api/owner/visits/start","/api/owner/visits/complete"].includes(url.pathname)){
      try{const s=await ensureSession(); const raw=typeof init.body==="string"?JSON.parse(init.body||"{}"):{}; const action=url.pathname.endsWith("/start")?"start":"complete"; return nativeFetch(`${ADAPTER}/staff/action`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${s.token}`},body:JSON.stringify({action,reservation_id:raw.reservation_id})})}catch(e){return response({ok:false,error:e.message},403)}
    }
    return nativeFetch(input,init);
  };
  function relabel(){
    const input=document.getElementById("adminCodeInput");
    const label=input?.closest("div")?.querySelector('label[for="adminCodeInput"]'); if(label)label.textContent="スタッフアクセスコード";
    const all=document.querySelector('#staffSelect option[value=""]'); if(all)all.textContent="スタッフを選択";
    document.getElementById("staffSelect")?.addEventListener("change",()=>{try{sessionStorage.removeItem(SESSION_KEY)}catch{}});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",relabel);else relabel();
})();
