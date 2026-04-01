import { Telegraf } from 'telegraf';
import { supabase } from './bot';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

if (!BOT_TOKEN) {
  console.warn('TELEGRAM_BOT_TOKEN is missing!');
}

/**
 * Global Telegraf instance for GradeMaster.
 * Using a singleton pattern to ensure we don't create multiple instances in Next.js dev mode.
 */
const globalForTelegraf = global as unknown as { bot: Telegraf };

export const bot = globalForTelegraf.bot || new Telegraf(BOT_TOKEN);

if (process.env.NODE_ENV !== 'production') globalForTelegraf.bot = bot;

// Register Handlers
import { behaviorHandler } from './behavior-handler';
bot.use(behaviorHandler);

// Export supabase for use in handlers
export { supabase };
