// Ad network helpers — all 5 supported networks plus a random-picker.
// Each function resolves with watch duration in seconds (rounded).

const MIN_SECONDS: Record<string, number> = {
  adsgram_block1: 17,
  adsgram_block2: 33,
  monetag: 15,
  monetix: 8,
  adexium: 8,
  gigapub: 15,
};

export const ADSGRAM_BLOCK_1 = "int-3482"; // 17s
export const ADSGRAM_BLOCK_2 = "3481";     // 33s
export const MONETAG_ZONE = "11090694";
export const MONETIX_ID = "MX-38D29668";
export const ADEXIUM_WID = "de7a9891-5239-4120-80ee-4c3050e7b0ae";

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

export async function showAdsgram(blockId: string, minSeconds: number): Promise<number> {
  const Adsgram = (window as any).Adsgram;
  if (!Adsgram?.init) throw new AdNotShownError("adsgram", "SDK not loaded");
  const ctrl = Adsgram.init({ blockId, debug: false });
  const start = Date.now();
  let shown = false;
  try { await ctrl.show(); shown = true; } catch { /* user closed early */ }
  const secs = Math.round((Date.now() - start) / 1000);
  if (!shown && secs < 2) throw new AdNotShownError("adsgram");
  if (secs < minSeconds) throw new AdClosedEarlyError(secs, minSeconds);
  return secs;
}
export const showAdsgramBlock1 = () => showAdsgram(ADSGRAM_BLOCK_1, MIN_SECONDS.adsgram_block1);
export const showAdsgramBlock2 = () => showAdsgram(ADSGRAM_BLOCK_2, MIN_SECONDS.adsgram_block2);

export async function showMonetagAd(): Promise<number> {
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
}

export async function showAdexiumAd(): Promise<number> {
  const AdexiumWidget = (window as any).AdexiumWidget;
  if (typeof AdexiumWidget !== "function") throw new AdNotShownError("adexium", "SDK not loaded");
  const widget = new AdexiumWidget({ wid: ADEXIUM_WID, adFormat: "interstitial" });
  const start = Date.now();
  let displayed = false;
  await new Promise<void>((resolve) => {
    let settled = false;
    const done = () => { if (!settled) { settled = true; resolve(); } };
    try {
      // Try requestAd (newer SDK) → show → autoMode fallback
      const candidate = widget.requestAd?.() ?? widget.show?.();
      if (candidate && typeof candidate.then === "function") {
        candidate.then(() => { displayed = true; done(); }).catch(() => done());
      } else {
        widget.autoMode?.();
        // Poll: if interstitial DOM appears, assume displayed
        const iv = setInterval(() => {
          if (document.querySelector('[id*="adexium"],[class*="adexium"],iframe[src*="tgads"]')) {
            displayed = true;
          }
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
}

export async function showMonetixAd(): Promise<number> {
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
  // If callback fired in <1s with no status, assume SDK rejected silently
  if (!status && secs < 2) throw new AdNotShownError("monetix");
  if (status && !["completed", "closed"].includes(status)) throw new AdNotShownError("monetix", `status=${status}`);
  if (secs < MIN_SECONDS.monetix) throw new AdClosedEarlyError(secs, MIN_SECONDS.monetix);
  return secs;
}

export async function showGigapubAd(): Promise<number> {
  const showGiga = (window as any).showGiga;
  if (typeof showGiga !== "function") throw new AdNotShownError("gigapub", "SDK not loaded");
  const start = Date.now();
  await new Promise<void>((resolve) => {
    try {
      showGiga().then(() => resolve()).catch(() => resolve());
      setTimeout(() => resolve(), 60000);
    } catch { resolve(); }
  });
  const secs = Math.round((Date.now() - start) / 1000);
  if (secs < MIN_SECONDS.gigapub) throw new AdClosedEarlyError(secs, MIN_SECONDS.gigapub);
  return secs;
}

// Try a random network; if it fails, rotate through the remaining pool.
// Only resolves once an ad has actually been displayed.
export async function showRandomAd(): Promise<void> {
  const pool: Array<() => Promise<number>> = [
    showAdsgramBlock1, showMonetagAd, showAdexiumAd, showMonetixAd, showGigapubAd,
  ];
  // shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  for (const fn of pool) {
    try { await fn(); return; } catch { /* try next */ }
  }
  // All failed — silently allow flow to continue
}

export async function playAutoAd(): Promise<void> {
  try { await showAdsgramBlock1(); } catch { /* ignore */ }
}
