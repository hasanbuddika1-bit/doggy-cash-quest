// Monetag SDK helper — plays a video ad before granting reward.
// Returns a promise that resolves when ad finishes (or fails silently).
export function showMonetagAd(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const fn = (window as any).show_10951973;
      if (typeof fn === "function") {
        const p = fn();
        if (p && typeof p.then === "function") {
          p.then(() => resolve()).catch(() => resolve());
          // Safety timeout — never block UX longer than 60s
          setTimeout(() => resolve(), 60000);
        } else {
          resolve();
        }
      } else {
        resolve();
      }
    } catch {
      resolve();
    }
  });
}
