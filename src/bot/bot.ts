// src/bot/bot.ts
import { Telegraf } from 'telegraf';
import { userMiddleware } from './middleware/user.middleware';
import { setupCoreCommands } from './commands/core.commands';
import { setupToolCommands } from './commands/tool.commands';
import { setupDocumentCommands } from './commands/document.commands';
import { setupUIActions } from './actions/ui.actions';
import { setupMessageHandlers } from './handlers/message.handler';

export function setupBot(bot: Telegraf) {
  // Global Error Handler
  bot.catch((err: any, ctx) => {
    console.error(`Unhandled error while processing ${ctx.updateType}:`, err);
    ctx.reply('⚠️ Beklenmedik bir hata oluştu, ancak çalışmaya devam ediyorum.').catch(() => {});
  });

  // Middleware
  bot.use(userMiddleware);

  // Setup Commands, Actions and Handlers
  setupCoreCommands(bot);
  setupToolCommands(bot);
  setupDocumentCommands(bot);
  setupUIActions(bot);
  setupMessageHandlers(bot);

  return bot;
}
