/* =========================================================
  STEP SEITAI-4
  DPRO 整骨院・整体 LINE
  config.js 完全版

  目的：
  ・GitHub Pages 側の各HTMLから共通で読み込む設定ファイル
  ・Worker API URL / デモ店舗コード / 画面バージョンを一元管理
  ・管理コードは公開ファイルに直書きしない方針

  Worker名：
  dpro-seitai-line-api

  Worker API：
  https://dpro-seitai-line-api.dpromstk2000.workers.dev

  管理コード：
  管理コードはCloudflare Secretsで店舗ごとに設定する
  ※ただし、この公開 config.js には管理コードを直書きしない
  ※owner.html / system-check.html 側で入力して localStorage 保存する想定
========================================================= */

(() => {
  "use strict";

  const STEP_VERSION = "STEP-SEITAI-NEXT-6-CONFIG-20260723";

  const CONFIG = {
    version: STEP_VERSION,

    serviceName: "DPRO 整骨院・整体 LINE",
    serviceSubtitle: "整骨院・整体・鍼灸院向け LINE予約・回数券・来院フォローシステム",

    shopCode: "dpro_seitai_demo",
    demoShopCode: "dpro_seitai_demo",
    shopName: "DPRO整体院",

    apiBaseUrl: "https://dpro-seitai-line-api.dpromstk2000.workers.dev",

    /*
      LINE LIFF ID は、LIFF作成後にここへ入れる。
      まだ未作成の場合は空欄でOK。
      例：
      liffId: "2000000000-xxxxxxxx"
    */
    liffId: "",
    liffUrl: "",

    /*
      GitHub Pages の公開URL。
      リポジトリ作成後、必要に応じて変更。
      例：
      https://dpromstk2000-lab.github.io/dpro-seitai-line/
    */
    pagesBaseUrl: "",

    /*
      管理コードは公開ファイルに直書きしない。
      owner.html / system-check.html 側で入力欄から保存して使う。
      管理コードの値は公開ファイルへ記載しない。
    */
    adminCodeStorageKey: "DPRO_SEITAI_ADMIN_CODE",
    adminCodeHeaderName: "X-DPRO-Admin-Code",

    defaultLocale: "ja-JP",
    timezone: "Asia/Tokyo",

    reservation: {
      defaultSlotMinutes: 30,
      maxMonthsAhead: 2
    },

    demo: {
      enabled: true,
      resetEndpoint: "/api/admin/demo/reset",
      safetyCheckEndpoint: "/api/admin/safety-check"
    },

    endpoints: {
      health: "/api/health",

      publicSettings: "/api/public/settings",
      appointmentOptions: "/api/public/appointment-options",

      reservationCreate: "/api/reservations/create",
      reservationUpdate: "/api/reservations/update",
      reservationCancel: "/api/reservations/cancel",

      ownerToday: "/api/owner/today",
      ownerSettings: "/api/owner/settings",
      ownerTicketsUse: "/api/owner/tickets/use",
      ownerFollowups: "/api/owner/followups",
      ownerCustomerSearch: "/api/owner/customers/search",
      ownerCustomerDetail: "/api/owner/customers/detail",

      demoReset: "/api/admin/demo/reset",
      safetyCheck: "/api/admin/safety-check"
    }
  };

  function trimSlash(value) {
    return String(value || "").replace(/\/+$/, "");
  }

  function joinUrl(baseUrl, path) {
    const base = trimSlash(baseUrl);
    const p = String(path || "");
    if (!p) return base;
    return `${base}${p.startsWith("/") ? p : `/${p}`}`;
  }

  function withShopCode(path) {
    const url = new URL(joinUrl(CONFIG.apiBaseUrl, path));
    url.searchParams.set("shop_code", CONFIG.shopCode);
    return url.toString();
  }

  function apiUrl(path, params = {}) {
    const url = new URL(joinUrl(CONFIG.apiBaseUrl, path));

    if (!url.searchParams.get("shop_code")) {
      url.searchParams.set("shop_code", CONFIG.shopCode);
    }

    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value) !== "") {
        url.searchParams.set(key, String(value));
      }
    });

    return url.toString();
  }

  function getSavedAdminCode() {
    try {
      return localStorage.getItem(CONFIG.adminCodeStorageKey) || "";
    } catch (error) {
      return "";
    }
  }

  function saveAdminCode(code) {
    try {
      localStorage.setItem(CONFIG.adminCodeStorageKey, String(code || "").trim());
      return true;
    } catch (error) {
      return false;
    }
  }

  function clearAdminCode() {
    try {
      localStorage.removeItem(CONFIG.adminCodeStorageKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  function adminHeaders(extraHeaders = {}) {
    const code = getSavedAdminCode();
    return {
      "Content-Type": "application/json",
      ...(code ? { [CONFIG.adminCodeHeaderName]: code } : {}),
      ...extraHeaders
    };
  }

  async function apiGet(path, params = {}, options = {}) {
    const response = await fetch(apiUrl(path, params), {
      method: "GET",
      headers: options.admin ? adminHeaders(options.headers || {}) : (options.headers || {})
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.ok === false) {
      throw new Error(data.message || data.error || `API error: ${response.status}`);
    }

    return data;
  }

  async function apiPost(path, body = {}, options = {}) {
    const response = await fetch(apiUrl(path, options.query || {}), {
      method: "POST",
      headers: options.admin ? adminHeaders(options.headers || {}) : {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      body: JSON.stringify(body || {})
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.ok === false) {
      throw new Error(data.message || data.error || `API error: ${response.status}`);
    }

    return data;
  }

  window.DPRO_SEITAI_CONFIG = CONFIG;

  window.DPRO_SEITAI_API = {
    joinUrl,
    withShopCode,
    apiUrl,
    getSavedAdminCode,
    saveAdminCode,
    clearAdminCode,
    adminHeaders,
    apiGet,
    apiPost
  };

  console.log(`[${STEP_VERSION}] config loaded`, {
    serviceName: CONFIG.serviceName,
    shopCode: CONFIG.shopCode,
    apiBaseUrl: CONFIG.apiBaseUrl
  });
})();
