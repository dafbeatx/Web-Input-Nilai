import { DeviceMode } from './types';

/**
 * Detects whether the current device is Android, Desktop, or an Interactive Flat Panel (Smart Board).
 * Criteria:
 * - 'android': Matches Android user-agent or touch screen with mobile viewport (< 768px).
 * - 'interactive_board': Large touchscreen (>= 1024px width, touch points > 0) without mobile platform identifiers.
 * - 'desktop': Non-touch or pointer-primary desktop PC/laptop.
 */
export function detectDeviceMode(): DeviceMode {
  if (typeof window === 'undefined') return 'desktop';

  // Allow developer/user override via localStorage or URL parameter
  const urlParam = new URLSearchParams(window.location.search).get('device_mode');
  if (urlParam === 'android' || urlParam === 'desktop' || urlParam === 'interactive_board') {
    return urlParam;
  }

  const saved = localStorage.getItem('ilrp_device_mode');
  if (saved === 'android' || saved === 'desktop' || saved === 'interactive_board') {
    return saved;
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const hasTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  const screenWidth = window.innerWidth || window.screen.width;

  const isAndroidUA = /android/i.test(userAgent);
  const isMobileUA = /iphone|ipad|ipod|android|mobile/i.test(userAgent);

  // Interactive Flat Panel (Digital Smart Board): Large screen with touch capability
  if (hasTouch && screenWidth >= 1024 && !isAndroidUA && !isMobileUA) {
    return 'interactive_board';
  }

  // Android or Mobile Smartphone
  if (isAndroidUA || (hasTouch && screenWidth < 768)) {
    return 'android';
  }

  // Large Android Tablet or Smart Board running Android OS
  if (isAndroidUA && screenWidth >= 1024) {
    return 'interactive_board';
  }

  return 'desktop';
}

export function saveDeviceMode(mode: DeviceMode): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('ilrp_device_mode', mode);
  }
}

