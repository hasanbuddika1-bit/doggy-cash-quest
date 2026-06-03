// Ad network helpers — all 4 supported networks plus a random-picker.
// Each function resolves with watch duration in seconds (rounded).

const MIN_SECONDS: Record<string, number> = {
  adsgram_block1: 17,
  adsgram_block2: 33,
  monetag: 15,
  adexium: 15,
  gigapub: 15,
};

export const ADSGRAM_BLOCK_1 = "int-33841"; // 17s, also used for auto-ad
export const ADSGRAM_BLOCK_2 = "33840";     // 33s
export const MONETAG_ZONE = "11090694";
export const ADEXIUM_WID = "de7a9891-5239-4120-80ee-4c3050e7b0ae";

export class AdClosedEarlyError extends Error {
  constructor(public seconds: number, public minRequired: number) {
    super(`Ad was closed early (${seconds}s / ${minRequired}s required)`);
  }
}

export async function showAdsgram(blockId: string, minSeconds: number): Promise<number> {
  const Adsgram = (window as any).Adsgram;
  if (!Adsgram?.init) throw new Error("Adsgram SDK not loaded");
  const ctrl = Adsgram.init({ blockId, debug: false });
  const start = Date.now();
  try { await ctrl.show(); } catch { /* user closed early */ }
  const secs = Math.round((Date.now() - start) / 1000);
  if (secs < minSeconds) throw new AdClosedEarlyError(secs, minSeconds);
  return secs;
}

export async function showAdsgramBlock1(): Promise<number> {
  return showAdsgram(ADSGRAM_BLOCK_1, MIN_SECONDS.adsgram_block1);
}
export async function showAdsgramBlock2(): Promise<number> {
  return showAdsgram(ADSGRAM_BLOCK_2, MIN_SECONDS.adsgram_block2);
}

export async function showMonetagAd(): Promise<number> {
  const fn = (window as any)[`show_${MONETAG_ZONE}`];
  if (typeof fn !== "function") throw new Error("Monetag SDK not loaded");
  const start = Date.now();
  await new Promise<void>((resolve) => {
    try {
      const p = fn();
      if (p && typeof p.then === "function") {
        p.then(() => resolve()).catch(() => resolve());
        setTimeout(() => resolve(), 60000);
      } else resolve();
    } catch { resolve(); }
  });
  const secs = Math.round((Date.now() - start) / 1000);
  if (secs < MIN_SECONDS.monetag) throw new AdClosedEarlyError(secs, MIN_SECONDS.monetag);
  return secs;
}

export async function showAdexiumAd(): Promise<number> {
  const AdexiumWidget = (window as any).AdexiumWidget;
  if (typeof AdexiumWidget !== "function") throw new Error("Adexium SDK not loaded");
  const widget = new AdexiumWidget({ wid: ADEXIUM_WID, adFormat: "interstitial" });
  const start = Date.now();
  await new Promise<void>((resolve) => {
    try {
      const p = widget.show?.();
      if (p && typeof p.then === "function") {
        p.then(() => resolve()).catch(() => resolve());
      } else {
        // Fallback: autoMode shows immediately; wait fixed
        widget.autoMode?.();
        setTimeout(() => resolve(), 18000);
      }
      setTimeout(() => resolve(), 60000);
    } catch { resolve(); }
  });
  const secs = Math.round((Date.now() - start) / 1000);
  if (secs < MIN_SECONDS.adexium) throw new AdClosedEarlyError(secs, MIN_SECONDS.adexium);
  return secs;
}

export async function showGigapubAd(): Promise<number> {
  const showGiga = (window as any).showGiga;
  if (typeof showGiga !== "function") throw new Error("GigaPub SDK not loaded");
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

// Random ad across Adsgram/Monetag/Adexium for actions like
// "claim refer reward" or "submit withdraw".
// Silently swallows failures so user-flow is never blocked.
export async function showRandomAd(): Promise<void> {
  const pool = [showAdsgramBlock1, showMonetagAd, showAdexiumAd];
  const pick = pool[Math.floor(Math.random() * pool.length)];
  try { await pick(); } catch { /* don't block user on ad failure */ }
}

// Auto-ad on app open — uses Adsgram block 1 silently
export async function playAutoAd(): Promise<void> {
  try { await showAdsgramBlock1(); } catch { /* ignore */ }
}
