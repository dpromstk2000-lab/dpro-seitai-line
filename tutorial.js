/* DPRO TUTORIAL SEITAI STANDARD V1.1 / R3 */
(() => {
  "use strict";
  const VERSION = "DPRO-TUTORIAL-SEITAI-STANDARD-V1.1-R3";
  const STORAGE_KEY = "DPRO_TUTORIAL_SEITAI_V1_1";
  const CONTRACT = [
    {id:"SEITAI-F10-01",order:1,route:"index.html",primary:"#heroShopName",fallback:["header .hero"],title:"予約画面の入口",copy:"店舗名と予約画面の役割を確認します。ここでは予約操作は行いません。",hash:"#heroShopName"},
    {id:"SEITAI-F10-02",order:2,route:"index.html",primary:"#sectionMenu .stepTitle",fallback:["#sectionMenu"],title:"メニュー選択",copy:"施術メニューを選ぶ場所を確認します。Tutorialは選択ボタンを自動クリックしません。",hash:"#sectionMenu"},
    {id:"SEITAI-F10-03",order:3,route:"index.html",primary:"#sectionStaff .stepTitle",fallback:["#sectionStaff"],title:"担当者選択",copy:"おまかせ・前回担当・指名・女性スタッフ希望の位置を確認します。",hash:"#sectionStaff"},
    {id:"SEITAI-F10-04",order:4,route:"index.html",primary:"#sectionConcern .stepTitle",fallback:["#sectionConcern"],title:"気になる内容",copy:"症状・要望を扱う領域を確認します。実在する健康情報は入力しません。",hash:"#sectionConcern"},
    {id:"SEITAI-F10-05",order:5,route:"index.html",primary:"#sectionDate .stepTitle",fallback:["#sectionDate"],title:"予約日時",copy:"日付と予約枠を確認する場所を案内します。空き枠取得ボタンは自動操作しません。",hash:"#sectionDate"},
    {id:"SEITAI-F10-06",order:6,route:"index.html",primary:"#sectionCustomer .stepTitle",fallback:["#sectionCustomer"],title:"お客様情報",copy:"予約時に必要な入力欄の場所だけ確認します。Tutorialは氏名・電話番号を入力・保存しません。",hash:"#sectionCustomer"},
    {id:"SEITAI-F10-07",order:7,route:"index.html",primary:"#confirmBox",fallback:["#sectionConfirm .stepTitle","#sectionConfirm"],title:"予約内容の確認欄",copy:"最終確認欄を確認します。「この内容で予約する」は押さず、次は会員画面へ直接移動します。",hash:"#confirmBox"},
    {id:"SEITAI-F10-08",order:8,route:"member.html",primary:"#memberCard",fallback:["main .memberCard"],title:"会員証エリア",copy:"会員証・基本表示の場所を確認します。本人確認やテスト顧客呼出しは実行しません。",hash:"#memberCard"},
    {id:"SEITAI-F10-09",order:9,route:"member.html",primary:"#memberNext7Overview",fallback:[".memberNext7Overview"],title:"会員ホームの概要",copy:"次の予約・来院回数・回数券・次回来院目安のまとまりを確認します。",hash:"#memberNext7Overview"},
    {id:"SEITAI-F10-10",order:10,route:"member.html",primary:"#memberHistorySection .sectionHead",fallback:["#memberHistorySection"],title:"来院履歴・前回内容",copy:"来院履歴・前回内容を確認する領域を案内してFirst10を完了します。",hash:"#memberHistorySection"}
  ];

  let card = null, highlight = null, launcher = null, target = null;
  let dragging = false, dragId = null, dragDX = 0, dragDY = 0;
  let raf = 0;

  const pageName = () => (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const clamp = (v,min,max) => Math.min(Math.max(v,min),Math.max(min,max));
  const loadState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!Number.isInteger(s.step) || s.step < 0 || s.step >= CONTRACT.length) return null;
      return s;
    } catch { return null; }
  };
  const saveState = (patch = {}) => {
    const old = loadState() || {step:0,active:false,completed:false,skipped:false};
    const next = {...old,...patch,version:VERSION,updatedAt:new Date().toISOString()};
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    updateLauncher();
    window.dispatchEvent(new CustomEvent("dpro-tutorial-state",{detail:next}));
    return next;
  };
  const hasResumableState = () => {
    const s = loadState();
    return !!(s && !s.completed && Number.isInteger(s.step));
  };
  const isVisible = (el) => {
    if (!el || !(el instanceof Element)) return false;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    return cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity || 1) !== 0 && r.width > 0 && r.height > 0;
  };
  const resolveTarget = (step) => {
    for (const selector of [step.primary,...step.fallback]) {
      let el = null;
      try { el = document.querySelector(selector); } catch {}
      if (isVisible(el)) return {el,selector};
    }
    const main = document.querySelector("main") || document.body;
    return {el:main,selector:"SAFE_FALLBACK:main"};
  };
  const removeUI = () => {
    if (raf) cancelAnimationFrame(raf);
    card?.remove(); highlight?.remove();
    card = null; highlight = null; target = null;
  };
  const ensureLauncher = () => {
    if (launcher?.isConnected) return launcher;
    launcher = document.createElement("button");
    launcher.id = "dproTutorialLauncher";
    launcher.type = "button";
    launcher.setAttribute("aria-label","DPROチュートリアル");
    launcher.addEventListener("click", () => {
      const s = loadState();
      if (s?.completed) replay();
      else if (hasResumableState()) resume();
      else start();
    });
    document.body.appendChild(launcher);
    updateLauncher();
    return launcher;
  };
  const updateLauncher = () => {
    if (!launcher?.isConnected) return;
    const s = loadState();
    launcher.textContent = s?.completed ? "Tutorial Replay" : hasResumableState() ? "Tutorial Resume" : "Tutorial Start";
  };
  const positionCardDefault = () => {
    if (!card) return;
    const s = loadState() || {};
    const r = card.getBoundingClientRect();
    const x = Number.isFinite(s.cardX) ? s.cardX : Math.max(8,innerWidth-r.width-16);
    const y = Number.isFinite(s.cardY) ? s.cardY : 16;
    card.style.left = `${clamp(x,8,innerWidth-r.width-8)}px`;
    card.style.top = `${clamp(y,8,innerHeight-r.height-8)}px`;
  };
  const clampCard = () => {
    if (!card) return;
    const r = card.getBoundingClientRect();
    const left = clamp(r.left,8,innerWidth-r.width-8);
    const top = clamp(r.top,8,innerHeight-r.height-8);
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
    saveState({cardX:left,cardY:top});
  };
  const updateHighlight = () => {
    if (!highlight || !target) return;
    const r = target.getBoundingClientRect();
    const pad = 5;
    const left = clamp(r.left-pad,2,innerWidth-4);
    const top = clamp(r.top-pad,2,innerHeight-4);
    const right = clamp(r.right+pad,4,innerWidth-2);
    const bottom = clamp(r.bottom+pad,4,innerHeight-2);
    highlight.style.left = `${left}px`;
    highlight.style.top = `${top}px`;
    highlight.style.width = `${Math.max(2,right-left)}px`;
    highlight.style.height = `${Math.max(2,bottom-top)}px`;
  };
  const scheduleHighlight = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(updateHighlight);
  };
  const navigateTo = (index) => {
    const step = CONTRACT[index];
    saveState({step:index,active:true,completed:false,skipped:false});
    if (pageName() !== step.route.toLowerCase()) {
      location.href = `${step.route}${step.hash || ""}`;
      return;
    }
    if (step.hash && location.hash !== step.hash) history.replaceState(null,"",step.hash);
    render(index);
  };
  const start = () => navigateTo(0);
  const resume = () => {
    const s = loadState() || {step:0};
    navigateTo(clamp(s.step,0,CONTRACT.length-1));
  };
  const replay = () => {
    saveState({step:0,active:true,completed:false,skipped:false,cardX:null,cardY:null});
    navigateTo(0);
  };
  const pause = () => {
    saveState({active:false});
    removeUI();
    ensureLauncher().focus({preventScroll:true});
  };
  const skip = () => {
    saveState({step:CONTRACT.length-1,active:false,completed:true,skipped:true});
    removeUI();
    ensureLauncher().focus({preventScroll:true});
  };
  const complete = () => {
    saveState({step:CONTRACT.length-1,active:false,completed:true,skipped:false});
    removeUI();
    ensureLauncher().focus({preventScroll:true});
  };
  const next = () => {
    const s = loadState() || {step:0};
    if (s.step >= CONTRACT.length-1) return complete();
    navigateTo(s.step+1);
  };
  const back = () => {
    const s = loadState() || {step:0};
    if (s.step <= 0) return render(0);
    navigateTo(s.step-1);
  };
  const render = (index) => {
    const step = CONTRACT[index];
    if (!step || pageName() !== step.route.toLowerCase()) return;
    removeUI();
    const resolved = resolveTarget(step);
    target = resolved.el;
    try { target.scrollIntoView({block:"center",inline:"nearest",behavior:"auto"}); } catch {}
    highlight = document.createElement("div");
    highlight.id = "dproTutorialHighlight";
    highlight.setAttribute("aria-hidden","true");
    document.body.appendChild(highlight);

    card = document.createElement("section");
    card.id = "dproTutorialCard";
    card.setAttribute("role","dialog");
    card.setAttribute("aria-modal","false");
    card.setAttribute("aria-label",`Tutorial ${step.order} / 10 ${step.title}`);
    card.dataset.stepId = step.id;
    card.dataset.stepOrder = String(step.order);
    card.dataset.targetSelector = resolved.selector;
    card.innerHTML = `
      <div class="dproTutHandle" data-dpro-tutorial-drag-handle tabindex="0" aria-label="チュートリアルカード移動ハンドル">
        <strong>DPRO TUTORIAL / SEITAI</strong><span class="dproTutGrip" aria-hidden="true">⠿</span>
      </div>
      <div class="dproTutBody">
        <div class="dproTutMeta"><span>STEP ${step.order} / 10</span><span>${step.id}</span></div>
        <h2 class="dproTutTitle">${step.title}</h2>
        <p class="dproTutCopy">${step.copy}</p>
        <div class="dproTutTarget">target: ${resolved.selector}</div>
        <div class="dproTutProgress" aria-label="進捗"><span style="width:${step.order*10}%"></span></div>
        <div class="dproTutActions">
          <button type="button" data-action="back"${index===0?' disabled':''}>Back</button>
          <button type="button" class="primary" data-action="next">${index===CONTRACT.length-1?'完了':'Next'}</button>
        </div>
        <div class="dproTutFooter">
          <button type="button" data-action="skip">Skip</button>
          <button type="button" data-action="close">Close / Esc</button>
        </div>
      </div>`;
    document.body.appendChild(card);
    const handle = card.querySelector("[data-dpro-tutorial-drag-handle]");
    handle.addEventListener("pointerdown", e => {
      if (e.button !== undefined && e.button !== 0 && e.pointerType !== "touch") return;
      const r = card.getBoundingClientRect();
      dragging = true; dragId = e.pointerId; dragDX = e.clientX-r.left; dragDY = e.clientY-r.top;
      try { handle.setPointerCapture(e.pointerId); } catch {}
      e.preventDefault();
    });
    window.addEventListener("pointermove", onPointerMove, {passive:false});
    window.addEventListener("pointerup", onPointerUp, {passive:false});
    card.addEventListener("click", e => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const a = btn.dataset.action;
      if (a==="next") next();
      else if (a==="back") back();
      else if (a==="close") pause();
      else if (a==="skip") skip();
    });
    positionCardDefault();
    setTimeout(() => {
      clampCard(); scheduleHighlight();
      card?.querySelector('[data-action="next"]')?.focus({preventScroll:true});
    },0);
  };
  const onPointerMove = (e) => {
    if (!dragging || !card || (dragId !== null && e.pointerId !== dragId)) return;
    const r = card.getBoundingClientRect();
    card.style.left = `${clamp(e.clientX-dragDX,8,innerWidth-r.width-8)}px`;
    card.style.top = `${clamp(e.clientY-dragDY,8,innerHeight-r.height-8)}px`;
    e.preventDefault();
  };
  const onPointerUp = (e) => {
    if (!dragging || (dragId !== null && e.pointerId !== dragId)) return;
    dragging = false; dragId = null; clampCard();
    e.preventDefault();
  };
  const onKey = e => {
    if (e.key === "Escape" && card) { e.preventDefault(); pause(); }
  };
  const init = () => {
    ensureLauncher();
    document.addEventListener("keydown",onKey);
    window.addEventListener("resize",() => { clampCard(); scheduleHighlight(); });
    window.addEventListener("scroll",scheduleHighlight,{passive:true});
    const s = loadState();
    if (s?.active && !s.completed) {
      const step = CONTRACT[s.step];
      if (step && pageName() === step.route.toLowerCase()) render(s.step);
    }
  };
  window.DPRO_TUTORIAL_SEITAI = {
    version:VERSION,storageKey:STORAGE_KEY,contract:CONTRACT,
    getState:loadState,hasResumableState,start,resume,replay,pause,skip,next,back,
    goTo:navigateTo
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
