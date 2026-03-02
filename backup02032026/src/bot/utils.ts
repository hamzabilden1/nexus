// src/bot/utils.ts
import { Context } from 'telegraf';

export async function sendLongMessage(ctx: Context, text: string) {
  if (!text) return;
  const MAX_LENGTH = 4000;
  if (text.length <= MAX_LENGTH) {
    try {
      await ctx.reply(text, { parse_mode: 'HTML' });
    } catch (e) {
      await ctx.reply(text);
    }
    return;
  }
  const chunks = text.match(new RegExp(`.{1,${MAX_LENGTH}}`, 'g')) || [];
  for (const chunk of chunks) {
    await ctx.reply(chunk, { parse_mode: 'HTML' }).catch(() => ctx.reply(chunk));
  }
}
