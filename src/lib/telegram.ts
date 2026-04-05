// Telegram Web App SDK integration
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    start_param?: string;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  openTelegramLink: (url: string) => void;
  openLink: (url: string) => void;
  MainButton: {
    text: string;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  };
  themeParams: Record<string, string>;
  colorScheme: 'light' | 'dark';
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

const TELEGRAM_WEB_APP_SCRIPT_URL = "https://telegram.org/js/telegram-web-app.js";
let telegramScriptPromise: Promise<TelegramWebApp | null> | null = null;

export async function ensureTelegramWebApp(): Promise<TelegramWebApp | null> {
  if (typeof window === "undefined") return null;
  if (window.Telegram?.WebApp) return window.Telegram.WebApp;

  if (!telegramScriptPromise) {
    telegramScriptPromise = new Promise((resolve) => {
      const resolveWebApp = () => resolve(window.Telegram?.WebApp || null);
      const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${TELEGRAM_WEB_APP_SCRIPT_URL}"]`);

      if (existingScript) {
        if (window.Telegram?.WebApp) {
          resolveWebApp();
          return;
        }

        existingScript.addEventListener("load", resolveWebApp, { once: true });
        existingScript.addEventListener("error", () => resolve(null), { once: true });
        window.setTimeout(resolveWebApp, 1500);
        return;
      }

      const script = document.createElement("script");
      script.src = TELEGRAM_WEB_APP_SCRIPT_URL;
      script.async = true;
      script.addEventListener("load", resolveWebApp, { once: true });
      script.addEventListener("error", () => resolve(null), { once: true });
      document.head.appendChild(script);
    });
  }

  return telegramScriptPromise;
}

export function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp || null;
}

export function getTelegramUser(): TelegramUser | null {
  const webapp = getTelegramWebApp();
  return webapp?.initDataUnsafe?.user || null;
}

export function getStartParam(): string | null {
  const webapp = getTelegramWebApp();
  return webapp?.initDataUnsafe?.start_param || null;
}

// Mock user for development outside Telegram
export function getMockUser(): TelegramUser {
  return {
    id: 123456789,
    first_name: "Test",
    username: "testuser",
    photo_url: "",
  };
}

export function getCurrentUser(): TelegramUser {
  return getTelegramUser() || getMockUser();
}
