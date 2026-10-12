// Client-side helper for Web Push Notifications

export interface BrowserEnvironment {
  name: string;
  isIOS: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
  isInAppBrowser: boolean;
  inAppAppName?: string;
  isSecure: boolean;
  supportsPush: boolean;
  reasonUnsupported?: string;
}

export interface SubscribeResult {
  success: boolean;
  status: 'GRANTED' | 'DENIED' | 'DEFAULT' | 'UNSUPPORTED' | 'ERROR';
  message: string;
}

// Detect client browser brand and push notification capabilities
export function detectBrowserEnvironment(): BrowserEnvironment {
  if (typeof window === 'undefined') {
    return {
      name: 'Server',
      isIOS: false,
      isAndroid: false,
      isStandalone: false,
      isInAppBrowser: false,
      isSecure: true,
      supportsPush: false,
      reasonUnsupported: 'Lingkungan server / bukan browser',
    };
  }

  const ua = window.navigator.userAgent || '';
  const isSecure = window.isSecureContext !== false;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
  const isAndroid = /Android/i.test(ua);
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  // In-app browsers detection (WhatsApp, Instagram, FB, Line, Telegram, TikTok, WeChat)
  let isInAppBrowser = false;
  let inAppAppName: string | undefined;

  if (/WhatsApp/i.test(ua)) {
    isInAppBrowser = true;
    inAppAppName = 'WhatsApp';
  } else if (/Instagram/i.test(ua)) {
    isInAppBrowser = true;
    inAppAppName = 'Instagram';
  } else if (/FBAN|FBAV/i.test(ua)) {
    isInAppBrowser = true;
    inAppAppName = 'Facebook';
  } else if (/Line\//i.test(ua)) {
    isInAppBrowser = true;
    inAppAppName = 'LINE';
  } else if (/Telegram/i.test(ua)) {
    isInAppBrowser = true;
    inAppAppName = 'Telegram';
  } else if (/MicroMessenger/i.test(ua)) {
    isInAppBrowser = true;
    inAppAppName = 'WeChat';
  } else if (/musical_ly|BytedanceWebview/i.test(ua)) {
    isInAppBrowser = true;
    inAppAppName = 'TikTok';
  }

  // Browser brand detection
  let name = 'Browser';
  if (/SamsungBrowser/i.test(ua)) {
    name = 'Samsung Internet';
  } else if (/Edg([A-Z]|ios|\/)/i.test(ua)) {
    name = 'Microsoft Edge';
  } else if (/OPR|Opera/i.test(ua)) {
    name = 'Opera';
  } else if (/Firefox|FxiOS/i.test(ua)) {
    name = 'Mozilla Firefox';
  } else if (isIOS && !/CriOS|FxiOS|EdgiOS/i.test(ua)) {
    name = 'Safari';
  } else if (/Chrome|CriOS/i.test(ua)) {
    name = 'Google Chrome';
  } else if (/Safari/i.test(ua)) {
    name = 'Safari';
  }

  let supportsPush = true;
  let reasonUnsupported: string | undefined;

  if (!isSecure) {
    supportsPush = false;
    reasonUnsupported = 'Koneksi tidak aman (HTTPS diperlukan untuk notifikasi push).';
  } else if (isInAppBrowser) {
    supportsPush = false;
    reasonUnsupported = `Browser internal ${inAppAppName || 'aplikasi'} tidak mendukung Web Push. Silakan buka lewat Google Chrome atau browser utama HP.`;
  } else if (isIOS && !isStandalone) {
    supportsPush = false;
    reasonUnsupported = 'Di iPhone/iPad, Web Push hanya aktif bila web ditambahkan ke Layar Utama (Add to Home Screen).';
  } else if (!('serviceWorker' in navigator)) {
    supportsPush = false;
    reasonUnsupported = 'Browser ini tidak mendukung Service Worker.';
  } else if (!('PushManager' in window)) {
    supportsPush = false;
    reasonUnsupported = 'Browser ini tidak mendukung Push Notifications.';
  } else if (typeof Notification === 'undefined') {
    supportsPush = false;
    reasonUnsupported = 'Fitur Notification tidak tersedia pada browser ini.';
  }

  return {
    name,
    isIOS,
    isAndroid,
    isStandalone,
    isInAppBrowser,
    inAppAppName,
    isSecure,
    supportsPush,
    reasonUnsupported,
  };
}

// Helper to convert base64 VAPID key to Uint8Array safely across browsers
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const cleanBase64 = (base64String || '')
    .trim()
    .replace(/^["']|["']$/g, '');
  const padding = '='.repeat((4 - (cleanBase64.length % 4)) % 4);
  const base64 = (cleanBase64 + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return detectBrowserEnvironment().supportsPush;
}

// Request notification permission safely supporting both Promise and legacy Safari callback patterns
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'denied';
  }

  // Modern Promise pattern (Chrome, Edge, Firefox, modern Safari)
  try {
    const promise = Notification.requestPermission();
    if (promise && typeof (promise as unknown as Promise<NotificationPermission>).then === 'function') {
      return await promise;
    }
  } catch {
    // If promise threw, fall through to callback pattern
  }

  // Legacy callback pattern (older Safari / WebKit)
  return new Promise<NotificationPermission>((resolve) => {
    try {
      Notification.requestPermission((perm) => {
        resolve(perm || 'denied');
      });
    } catch {
      resolve('denied');
    }
  });
}

// Request permission and subscribe the user to Web Push
export async function subscribeUser(studentAccountId: string): Promise<SubscribeResult> {
  const env = detectBrowserEnvironment();
  if (!env.supportsPush) {
    console.warn('[Push Helper] Push notifications are not supported in this browser:', env.reasonUnsupported);
    return {
      success: false,
      status: 'UNSUPPORTED',
      message: env.reasonUnsupported || 'Browser tidak mendukung notifikasi push.',
    };
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.error('[Push Helper] VAPID Public Key environment variable is missing.');
    return {
      success: false,
      status: 'ERROR',
      message: 'Kunci notifikasi (VAPID) belum dikonfigurasi di server.',
    };
  }

  try {
    // 1. Request notification permission IMMEDIATELY within user gesture
    const permission = await requestNotificationPermission();
    if (permission === 'denied') {
      console.warn('[Push Helper] Notification permission denied by browser/user.');
      return {
        success: false,
        status: 'DENIED',
        message: 'Izin notifikasi diblokir oleh browser. Harap buka izin di pengaturan browser.',
      };
    }

    if (permission !== 'granted') {
      console.warn('[Push Helper] Notification permission was dismissed or not granted.');
      return {
        success: false,
        status: 'DEFAULT',
        message: 'Izin notifikasi belum diberikan atau jendela izin ditutup.',
      };
    }

    // 2. Register Service Worker with timeout protection
    let registration: ServiceWorkerRegistration;
    try {
      registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      const readyPromise = navigator.serviceWorker.ready;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('SW_TIMEOUT')), 8000)
      );
      await Promise.race([readyPromise, timeoutPromise]);
    } catch (swErr) {
      console.warn('[Push Helper] Service Worker registration failed or timed out:', swErr);
      return {
        success: false,
        status: 'ERROR',
        message: 'Service Worker tidak dapat diinisialisasi pada browser ini.',
      };
    }

    // 3. Subscribe to push manager (reuse existing subscription if active)
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      let applicationServerKey: Uint8Array;
      try {
        applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      } catch (keyErr) {
        console.error('[Push Helper] Failed to parse VAPID public key:', keyErr);
        return {
          success: false,
          status: 'ERROR',
          message: 'Format kunci VAPID tidak valid.',
        };
      }

      const subscribeOptions: PushSubscriptionOptionsInit = {
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as unknown as ArrayBuffer,
      };

      subscription = await registration.pushManager.subscribe(subscribeOptions);
    }

    console.log('[Push Helper] Browser push subscription created successfully:', subscription);

    // 4. Save subscription to the database via API
    const response = await fetch('/api/grademaster/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentAccountId,
        subscription,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Gagal menyimpan subscription ke server.');
    }

    console.log('[Push Helper] Subscription persisted to backend successfully.');
    return {
      success: true,
      status: 'GRANTED',
      message: 'Notifikasi berhasil diaktifkan!',
    };
  } catch (err: unknown) {
    console.error('[Push Helper] Error during user push subscription:', err);
    let errorMessage = 'Terjadi kesalahan saat mengaktifkan notifikasi.';
    const anyErr = err as { name?: string; message?: string };
    if (anyErr?.name === 'AbortError') {
      errorMessage = 'Layanan push browser ditolak (periksa proteksi privasi seperti Brave Shields atau Firefox Strict).';
    } else if (anyErr?.name === 'NotAllowedError') {
      errorMessage = 'Izin notifikasi tidak diizinkan oleh sistem perangkat atau browser.';
    } else if (anyErr?.name === 'SecurityError') {
      errorMessage = 'Fitur notifikasi dibatasi oleh kebijakan keamanan browser.';
    } else if (anyErr?.message) {
      errorMessage = anyErr.message;
    }

    return {
      success: false,
      status: 'ERROR',
      message: errorMessage,
    };
  }
}

// Unsubscribe the user from push notifications
export async function unsubscribeUser(studentAccountId: string): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();

      const response = await fetch('/api/grademaster/push/subscribe', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentAccountId,
        }),
      });

      if (!response.ok) {
        console.warn('[Push Helper] Subscription removed from browser but failed to remove from backend database.');
      } else {
        console.log('[Push Helper] Subscription successfully removed from browser and database.');
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error('[Push Helper] Error during user push unsubscription:', err);
    return false;
  }
}

// Check current subscription status
export async function checkSubscriptionStatus(): Promise<'GRANTED' | 'DENIED' | 'DEFAULT' | 'UNSUPPORTED'> {
  if (!isPushSupported()) return 'UNSUPPORTED';
  if (typeof Notification === 'undefined') return 'UNSUPPORTED';

  try {
    const permission = Notification.permission;
    if (permission === 'granted') return 'GRANTED';
    if (permission === 'denied') return 'DENIED';
    return 'DEFAULT';
  } catch {
    return 'UNSUPPORTED';
  }
}
