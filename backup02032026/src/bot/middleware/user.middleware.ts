// src/bot/middleware/user.middleware.ts
import { Context } from 'telegraf';
import { isUpdateProcessed, markUpdateAsProcessed, createUser } from '../../services/database';

export const userMiddleware = async (ctx: Context, next: () => Promise<void>) => {
  const updateId = ctx.update.update_id;
  
  try {
    if (await isUpdateProcessed(updateId)) {
      return; 
    }
    await markUpdateAsProcessed(updateId);
  } catch (e) {
    console.error("Update Tracking Error:", e);
  }

  if (ctx.from) {
    await createUser(ctx.from.id, ctx.from.username || '');
  }
  return next();
};
