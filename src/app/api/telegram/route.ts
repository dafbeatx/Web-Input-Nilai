import { NextRequest, NextResponse } from 'next/server';
import { TelegramUpdate, isAdmin, answerCallbackQuery } from '@/lib/telegram/bot';
import { handleAdminCommand, handleAdminCallback } from '@/lib/telegram/admin-handler';
import { handleUserCommand, handleUserCallback } from '@/lib/telegram/user-handler';

export async function POST(req: NextRequest) {
  try {
    const update: TelegramUpdate = await req.json();

    // --- NEW: Bridge to Telegraf ---
    const { bot } = await import('@/lib/telegram/telegraf');
    // We let Telegraf handle what it can (Behavior system, etc.)
    // Note: handleUpdate is async but we don't necessarily need to await it
    // if we want to also run the manual handlers.
    await bot.handleUpdate(update as any);

    if (update.callback_query) {
      const chatId = update.callback_query.message.chat.id;
      const messageId = update.callback_query.message.message_id;
      const data = update.callback_query.data;

      // Only run manual handler if not handled by Telegraf prefixes
      if (!data.startsWith('stubeh:')) {
        await answerCallbackQuery(update.callback_query.id);
        if (isAdmin(chatId)) {
          await handleAdminCallback(chatId, data, messageId, update);
        } else {
          await handleUserCallback(chatId, data);
        }
      }

      return NextResponse.json({ ok: true });
    }

    if (update.message?.text) {
      const chatId = update.message.chat.id;
      const messageId = update.message.message_id;
      const text = update.message.text.trim();

      // Only run manual handler if not a behavior command or if we want dual support
      if (isAdmin(chatId)) {
        await handleAdminCommand(chatId, text, messageId);
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
