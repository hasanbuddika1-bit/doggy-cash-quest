// Ad network helpers — all 5 supported networks plus a random-picker.
// Each function resolves with watch duration in seconds (rounded).

const MIN_SECONDS: Record<string, number> = {
  adsgram_block1: 30,
  adsgram_block2: 30,
  monetag: 5,
  monetix: 4,
  adexium: 8,
  gigapub: 15,
};

// Only block 35464 is used now (per admin request — old int-35465/34573 removed).
export const ADSGRAM_BLOCK_1 = "35464";     // 33s
export const ADSGRAM_BLOCK_2 = "35464";     // 33s
export const MONETAG_ZONE = "11090694";
export const MONETIX_ID = "MX-38D29668";
export const ADEXIUM_WID = "de7a9891-5239-4120-80ee-4c3050e7b0ae";

const OLD_ADSGRAM_BLOCK_ERROR = /AdsgramError|blockId\s*=\s*34573|blockId\s*=\s*int-35465|doggy-cash-quest\.vercel\.app/i;

export class AdClosedEarlyError extends Error {
  constructor(public seconds: number, public minRequired: number) {
    super(`Ad was closed early (${seconds}s / ${minRequired}s required)`);
  }
}
export class AdNotShownError extends Error {
  constructor(public network: string, msg = "Ad did not display") {
    super(`${network}: ${msg}`);
  }
}

let adInProgress = false;
async function withSingleAd<T>(network: string, fn: () => Promise<T>): Promise<T> {
  if (adInProgress) throw new AdNotShownError(network, "Another ad is already playing");
  adInProgress = true;
  try {
    return await fn();
  } finally {
    adInProgress = false;
  }
}

// Some third-party SDKs used before can still try to show the old Adsgram block
// from cache/auto-init. Suppress only that stale native alert; valid app alerts stay untouched.
function installOldAdsgramBlockGuard() {
  const w = window as any;
  if (w.__bunnyOldAdsgramBlockGuardInstalled) return;
  w.__bunnyOldAdsgramBlockGuardInstalled = true;

  const originalAlert = window.alert.bind(window);
  window.alert = (message?: any) => {
    const text = String(message ?? "");
    if (OLD_ADSGRAM_BLOCK_ERROR.test(text)) return;
    originalAlert(message);
  };

  const webApp = w.Telegram?.WebApp;
  if (webApp?.showAlert) {
    const originalShowAlert = webApp.showAlert.bind(webApp);
    webApp.showAlert = (message: string, callback?: () => void) => {
      const text = String(message ?? "");
      if (OLD_ADSGRAM_BLOCK_ERROR.test(text)) {
        callback?.();
        return;
      }
      return originalShowAlert(message, callback);
    };
  }

  if (webApp?.showPopup) {
    const originalShowPopup = webApp.showPopup.bind(webApp);
    webApp.showPopup = (params: { title?: string; message?: string; [key: string]: unknown }, callback?: (buttonId: string) => void) => {
      const text = `${String(params?.title ?? "")} ${String(params?.message ?? "")}`;
      if (OLD_ADSGRAM_BLOCK_ERROR.test(text)) {
        callback?.("close");
        return;
      }
      return originalShowPopup(params, callback);
    };
  }
}

if (typeof window !== "undefined") installOldAdsgramBlockGuard();

function loadScriptOnce(id: string, src: string, attrs?: Record<string, string>): Promise<void> {
  const existing = document.getElementById(id) as HTMLScriptElement | null;
  if (existing?.dataset.loaded === "true") return Promise.resolve();
  if (existing?.dataset.loading === "true") {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`${id} failed to load`)), { once: true });
    });
  }

  return new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.id = id;
    s.src = src;
    s.async = true;
    s.dataset.loading = "true";
    Object.entries(attrs || {}).forEach(([key, value]) => s.setAttribute(key, value));
    s.onload = () => { s.dataset.loaded = "true"; resolve(); };
    s.onerror = () => reject(new Error(`${id} failed to load`));
    document.head.appendChild(s);
  });
}

// Fully isolate Adsgram SDK so other networks (esp. GigaPub) can't trigger an
// Adsgram auto-popup like "Platform App url for blockId = XXXX not equal to ...".
function disableAdsgramTemporarily(): () => void {
  const w = window as any;
  const originalAdsgram = w.Adsgram;
  const originalSad = w.sad;
  try {
    w.Adsgram = {
      init: () => ({ show: async () => { throw new Error("Adsgram disabled during other network ad"); } }),
    };
    if (w.sad) w.sad = undefined;
  } catch { /* ignore */ }
  return () => {
    try { w.Adsgram = originalAdsgram; } catch { /* ignore */ }
    try { w.sad = originalSad; } catch { /* ignore */ }
  };
}

let adsgramLoadPromise: Promise<void> | null = null;
function loadAdsgramSDK(): Promise<void> {
  installOldAdsgramBlockGuard();
  if ((window as any).Adsgram?.init) return Promise.resolve();
  if (adsgramLoadPromise) return adsgramLoadPromise;
  adsgramLoadPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://sad.adsgram.ai/js/sad.min.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { adsgramLoadPromise = null; reject(new AdNotShownError("adsgram", "SDK failed to load")); };
    document.head.appendChild(s);
  });
  return adsgramLoadPromise;
}

export async function showAdsgram(blockId: string, minSeconds: number): Promise<number> {
  return withSingleAd("adsgram", async () => {
    await loadAdsgramSDK();
    const Adsgram = (window as any).Adsgram;
    if (!Adsgram?.init) throw new AdNotShownError("adsgram", "SDK not loaded");
    const ctrl = Adsgram.init({ blockId, debug: false });
    const start = Date.now();
    let shown = false;
    try { await ctrl.show(); shown = true; } catch { /* user closed early / SDK rejected */ }
    const secs = Math.round((Date.now() - start) / 1000);
    if (!shown && secs < 2) throw new AdNotShownError("adsgram");
    if (secs < minSeconds) throw new AdClosedEarlyError(secs, minSeconds);
    return secs;
  });
}
export const showAdsgramBlock1 = () => showAdsgram(ADSGRAM_BLOCK_1, MIN_SECONDS.adsgram_block1);
export const showAdsgramBlock2 = () => showAdsgram(ADSGRAM_BLOCK_2, MIN_SECONDS.adsgram_block2);

export async function showMonetagAd(): Promise<number> {
  return withSingleAd("monetag", async () => {
    const restore = disableAdsgramTemporarily();
    try {
      await loadScriptOnce("bunny-monetag-sdk", "https://libtl.com/sdk.js", { "data-zone": MONETAG_ZONE, "data-sdk": `show_${MONETAG_ZONE}` });
      const fn = (window as any)[`show_${MONETAG_ZONE}`];
      if (typeof fn !== "function") throw new AdNotShownError("monetag", "SDK not loaded");
      const start = Date.now();
      await new Promise<void>((resolve, reject) => {
        try {
          const p = fn();
          if (p && typeof p.then === "function") {
            p.then(() => resolve()).catch(() => resolve());
            setTimeout(() => resolve(), 60000);
          } else resolve();
        } catch (e) { reject(e); }
      });
      const secs = Math.round((Date.now() - start) / 1000);
      if (secs < MIN_SECONDS.monetag) throw new AdClosedEarlyError(secs, MIN_SECONDS.monetag);
      return secs;
    } finally { restore(); }
  });
}

export async function showAdexiumAd(): Promise<number> {
  return withSingleAd("adexium", async () => {
    const restore = disableAdsgramTemporarily();
    try {
      await loadScriptOnce("bunny-adexium-sdk", "https://cdn.tgads.space/assets/js/adexium-widget.min.js");
      const AdexiumWidget = (window as any).AdexiumWidget;
      if (typeof AdexiumWidget !== "function") throw new AdNotShownError("adexium", "SDK not loaded");
      const widget = new AdexiumWidget({ wid: ADEXIUM_WID, adFormat: "interstitial" });
      const start = Date.now();
      let displayed = false;
      await new Promise<void>((resolve) => {
        let settled = false;
        const done = () => { if (!settled) { settled = true; resolve(); } };
        try {
          const candidate = widget.requestAd?.() ?? widget.show?.();
          if (candidate && typeof candidate.then === "function") {
            candidate.then(() => { displayed = true; done(); }).catch(() => done());
          } else {
            widget.autoMode?.();
            const iv = setInterval(() => {
              if (document.querySelector('[id*="adexium"],[class*="adexium"],iframe[src*="tgads"]')) displayed = true;
            }, 500);
            setTimeout(() => { clearInterval(iv); done(); }, 20000);
          }
          setTimeout(done, 60000);
        } catch { done(); }
      });
      const secs = Math.round((Date.now() - start) / 1000);
      if (!displayed && secs < MIN_SECONDS.adexium) throw new AdNotShownError("adexium");
      if (secs < MIN_SECONDS.adexium) throw new AdClosedEarlyError(secs, MIN_SECONDS.adexium);
      return secs;
    } finally { restore(); }
  });
}

export async function showMonetixAd(): Promise<number> {
  return withSingleAd("monetix", async () => {
    const restore = disableAdsgramTemporarily();
    try {
      await loadScriptOnce("bunny-monetix-sdk", "https://www.monetixads.online/ads.js", { "data-mxid": MONETIX_ID });
      const showRewardAd = (window as any).showRewardAd;
      if (typeof showRewardAd !== "function") throw new AdNotShownError("monetix", "SDK not loaded");
      const start = Date.now();
      let status = "";
      await new Promise<void>((resolve) => {
        let settled = false;
        const done = () => { if (!settled) { settled = true; resolve(); } };
        try {
          showRewardAd((res: any) => { status = res?.status || ""; done(); });
          setTimeout(done, 60000);
        } catch { done(); }
      });
      const secs = Math.round((Date.now() - start) / 1000);
      if (!status && secs < 2) throw new AdNotShownError("monetix");
      if (status && !["completed", "closed"].includes(status)) throw new AdNotShownError("monetix", `status=${status}`);
      if (secs < MIN_SECONDS.monetix) throw new AdClosedEarlyError(secs, MIN_SECONDS.monetix);
      return secs;
    } finally { restore(); }
  });
}

export async function showGigapubAd(): Promise<number> {
  return withSingleAd("gigapub", async () => {
    const restore = disableAdsgramTemporarily();
    try {
      await loadScriptOnce("bunny-gigapub-sdk", "https://ad.gigapub.tech/script?id=6859");
      const showGiga = (window as any).showGiga;
      if (typeof showGiga !== "function") throw new AdNotShownError("gigapub", "SDK not loaded");
      const start = Date.now();
      await new Promise<void>((resolve) => {
        try {
          const p = showGiga();
          if (p && typeof p.then === "function") {
            p.then(() => resolve()).catch(() => resolve());
          } else resolve();
          setTimeout(() => resolve(), 60000);
        } catch { resolve(); }
      });
      const secs = Math.round((Date.now() - start) / 1000);
      if (secs < MIN_SECONDS.gigapub) throw new AdClosedEarlyError(secs, MIN_SECONDS.gigapub);
      return secs;
    } finally { restore(); }
  });
}

// Reward-claim ads only use ONE network per claim: Adsgram OR GigaPub.
// We alternate deterministically and NEVER cross-fallback (that caused two SDKs to fire).
export async function showRandomAd(): Promise<void> {
  const last = localStorage.getItem("bunny_last_claim_ad_network");
  const next = last === "adsgram" ? "gigapub" : "adsgram";
  localStorage.setItem("bunny_last_claim_ad_network", next);
  if (next === "gigapub") {
    await showGigapubAd();
  } else {
    await showAdsgramBlock1();
  }
}

export async function playAutoAd(): Promise<void> {
  // Disabled: automatic startup ads can overlap with selected GigaPub/Adsgram ads.
}
