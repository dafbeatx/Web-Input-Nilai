import { Layer } from './types';

const STORAGE_KEY = 'gm_active_layer';

export function saveActiveLayer(layer: Layer): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, layer);
}

export function getActiveLayer(): Layer | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw && ['home', 'setup', 'dashboard', 'remedial'].includes(raw)) {
    return raw as Layer;
  }
  return null;
}

export function clearActiveLayer(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
