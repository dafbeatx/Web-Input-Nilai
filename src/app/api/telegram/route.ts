import { NextRequest, NextResponse } from 'next/server';
import { TelegramUpdate, isAdmin, answerCallbackQuery } from '@/lib/telegram/bot';
import { handleAdminCommand, handleAdminCallback } from '@/lib/telegram/admin-handler';
import { handleUserCommand, handleUserCallback } from '@/lib/telegram/user-handler';

export async function POST(req: NextRequest) {
  try {
    const update: TelegramUpdate = await req.json();

    if (update.callback_query) {
      const chatId = update.callback_query.message.chat.id;
      const data = update.callback_query.data;

      await answerCallbackQuery(update.callback_query.id);

      if (isAdmin(chatId)) {
        await handleAdminCallback(chatId, data);
      } else {
        await handleUserCallback(chatId, data);
      }

      return NextResponse.json({ ok: true });
    }

    if (update.message?.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();

      if (isAdmin(chatId)) {
        await handleAdminCommand(chatId, text);
      } else {
        await handleUserCommand(chatId, text);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Telegram webhook error:', err);
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'GradeMaster Telegram Bot webhook is active' });
}
