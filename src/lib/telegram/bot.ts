import { supabase } from '@/lib/supabase/client';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '';
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

export function isAdmin(chatId: number | string): boolean {
  return String(chatId) === ADMIN_CHAT_ID;
}

export async function sendMessage(chatId: number | string, text: string, parseMode: string = 'HTML') {
  await fetch(`${API_BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    }),
  });
}

export async function sendInlineKeyboard(
  chatId: number | string,
  text: string,
  keyboard: { text: string; callback_data: string }[][]
) {
  const res = await fetch(`${API_BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard },
    }),
  });
  return res.json();
}

export async function editMessageText(
  chatId: number | string,
  messageId: number,
  text: string,
  keyboard?: { text: string; callback_data: string }[][]
) {
  const payload: any = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
  };
  if (keyboard) {
    payload.reply_markup = { inline_keyboard: keyboard };
  }
  const res = await fetch(`${API_BASE}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await fetch(`${API_BASE}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text || '',
    }),
  });
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; first_name: string; username?: string };
    chat: { id: number; type: string };
    text?: string;
    date: number;
  };
  callback_query?: {
    id: string;
    from: { id: number; first_name: string; username?: string };
    message: { message_id: number; chat: { id: number } };
    data: string;
  };
}

export async function sendPhoto(
  chatId: number | string,
  photo: string | Blob,
  caption?: string
) {
  const formData = new FormData();
  formData.append('chat_id', String(chatId));
  
  // Telegram requires a filename when sending a blob/buffer
  if (typeof photo !== 'string') {
    formData.append('photo', photo, 'student_photo.jpg');
  } else {
    formData.append('photo', photo);
  }

  if (caption) formData.append('caption', caption);
  formData.append('parse_mode', 'HTML');

  const res = await fetch(`${API_BASE}/sendPhoto`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

export async function sendDocument(
  chatId: number | string,
  doc: Blob,
  filename: string,
  caption?: string
) {
  const formData = new FormData();
  formData.append('chat_id', String(chatId));
  formData.append('document', doc, filename);
  if (caption) {
    formData.append('caption', caption);
    formData.append('parse_mode', 'HTML');
  }
  const res = await fetch(`${API_BASE}/sendDocument`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

export async function sendAdminNotification(text: string, photo?: string | Blob) {
  if (!ADMIN_CHAT_ID) return;
  if (photo) {
    return sendPhoto(ADMIN_CHAT_ID, photo, text);
  }
  return sendMessage(ADMIN_CHAT_ID, text);
}

export { supabase };
