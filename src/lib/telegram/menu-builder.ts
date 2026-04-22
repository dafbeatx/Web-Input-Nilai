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

/**
 * Build a simple date picker keyboard showing ±N days from today.
 */
export function buildDateKeyboard(
  actionPrefix: string,
  daysRange: number = 3
): { text: string; callback_data: string }[][] {
  const keyboard: { text: string; callback_data: string }[][] = [];
  const today = new Date();

  for (let offset = -daysRange; offset <= 0; offset += 4) {
    const row: { text: string; callback_data: string }[] = [];
    for (let j = offset; j < offset + 4 && j <= 0; j++) {
      const d = new Date(today);
      d.setDate(d.getDate() + j);
      const iso = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });
      const dateNum = d.getDate();
      const label = j === 0 ? `📅 Hari Ini` : `${dayName} ${dateNum}`;
      row.push({ text: label, callback_data: `${actionPrefix}:${iso}` });
    }
    keyboard.push(row);
  }

  return keyboard;
}

/**
 * Build a text-based horizontal bar chart.
 */
export function buildBarChart(
  data: { label: string; value: number }[],
  maxBarLength: number = 10
): string {
  if (data.length === 0) return '(Tidak ada data)';
  const maxVal = Math.max(...data.map(d => d.value), 1);

  return data.map(d => {
    const filled = Math.round((d.value / maxVal) * maxBarLength);
    const empty = maxBarLength - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `${d.label.padEnd(7)} ${bar} ${d.value}`;
  }).join('\n');
}
