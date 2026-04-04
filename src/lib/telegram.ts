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
