/**
 * Helper to compress 36-char UUIDs to 22-char Base64URL string for Telegram callback_data limits.
 * Uses Node.js Buffer API compatible with Next.js Serverless runtime.
 */
export function compressUUID(uuid: string): string {
  if (!uuid || uuid.length !== 36) return uuid; // Fallback
  const hex = uuid.replace(/-/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  const b64 = Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Reverses the Base64URL compression back to standard UUID format.
 */
export function decompressUUID(b64url: string): string {
  if (!b64url || b64url.length !== 22) return b64url; // Fallback
  let base64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const bytes = Buffer.from(base64, 'base64');
  const hex = bytes.toString('hex');
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32),
  ].join('-');
}

export interface KeyboardItem {
  text: string;
  id: string; // The data/ID to be compressed and sent
  extraData?: string; // Optional small string data to append e.g. "a:param"
}

export function buildPaginationKeyboard(
  items: KeyboardItem[],
  currentPage: number,
  pageSize: number,
  actionPrefix: string, // e.g. "ses" -> ses:compressed_id
  pageAction: string,   // e.g. "page_ses" -> page_ses:2
  backAction?: string   // e.g. "menu_main"
) {
  const keyboard: { text: string; callback_data: string }[][] = [];
  
  // Slice items for current page
  const startIdx = (currentPage - 1) * pageSize;
  const pageItems = items.slice(startIdx, startIdx + pageSize);
  
  // Item buttons (1 button per row)
  for (const item of pageItems) {
    let data = `${actionPrefix}:${item.id.length === 36 ? compressUUID(item.id) : item.id}`;
    if (item.extraData) {
      data += `:${item.extraData}`;
    }
    keyboard.push([{ text: item.text, callback_data: data }]);
  }
  
  // Navigation row
  const navRow: { text: string; callback_data: string }[] = [];
  const totalPages = Math.ceil(items.length / pageSize) || 1;
  
  if (currentPage > 1) {
    navRow.push({ text: '⬅️', callback_data: `${pageAction}:${currentPage - 1}` });
  } else if (backAction) {
    navRow.push({ text: '🔙 Back', callback_data: backAction });
  }
  
  if (totalPages > 1) {
    navRow.push({ text: `${currentPage}/${totalPages}`, callback_data: 'noop' }); // Visual only
  }
  
  if (currentPage < totalPages) {
    navRow.push({ text: '➡️', callback_data: `${pageAction}:${currentPage + 1}` });
  }
  
  if (navRow.length > 0) {
    keyboard.push(navRow);
  }
  
  return keyboard;
}
