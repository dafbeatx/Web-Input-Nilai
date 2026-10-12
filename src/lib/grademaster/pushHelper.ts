// Client-side helper for Web Push Notifications

// Helper to convert base64 VAPID key to Uint8Array
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
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
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

// Request permission and subscribe the user
export async function subscribeUser(studentAccountId: string): Promise<boolean> {
  if (!isPushSupported()) {
    console.warn('[Push Helper] Push notifications are not supported in this browser.');
    return false;
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.error('[Push Helper] VAPID Public Key environment variable is missing.');
    return false;
  }

  try {
    // 1. Register and wait for Service Worker to be active
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    // 2. Request notification permission from the browser
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[Push Helper] Permission for notifications was denied.');
      return false;
    }

    // 3. Subscribe to the push service
    const subscribeOptions = {
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as any,
    };

    const subscription = await registration.pushManager.subscribe(subscribeOptions);
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
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save push subscription to backend');
    }

    console.log('[Push Helper] Subscription persisted to backend successfully.');
    return true;
  } catch (err) {
    console.error('[Push Helper] Error during user push subscription:', err);
    return false;
  }
}

// Unsubscribe the user from push notifications
export async function unsubscribeUser(studentAccountId: string): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // 1. Unsubscribe via browser pushManager
      await subscription.unsubscribe();

      // 2. Remove subscription from the database via API
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

  const permission = Notification.permission;
  if (permission === 'granted') return 'GRANTED';
  if (permission === 'denied') return 'DENIED';
  return 'DEFAULT';
}
