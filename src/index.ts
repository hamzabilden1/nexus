// src/index.ts
import { Telegraf, Markup, Context } from 'telegraf';
import * as dotenv from 'dotenv';
import { availableModels, defaultModelId, AIModel } from './config/models';
import { initDatabase, createUser, getUser, updateUserModel, updateUserPersona, saveMessage } from './services/database';
import { getPersonas, getPersonaById, DEFAULT_PERSONA_ID } from './services/personas';
import { askAI } from './services/ai';
import { searchAndSummarize } from './services/search';

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');

// Middleware
bot.use(async (ctx, next) => {
  if (ctx.from) {
    await createUser(ctx.from.id, ctx.from.username);
  }
  return next();
});

// --- ANA MENÜ (/start) ---
bot.start(async (ctx) => {
  const user = await getUser(ctx.from.id);
  const currentModelId = user ? user.current_model_id : defaultModelId;
  const currentPersonaId = user ? user.current_persona_id : DEFAULT_PERSONA_ID;
  const persona = getPersonaById(currentPersonaId);
  const modelName = availableModels.find(m => m.id === currentModelId)?.name || "Bilinmiyor";

  await ctx.reply(
    `👋 <b>Merhaba ${ctx.from.first_name}! Ben Nexus Prime.</b>\n\n` +
    `🤖 <b>Mevcut Model:</b> ${modelName}\n` +
    `🎭 <b>Mevcut Rol:</b> ${persona ? persona.name : 'Standart'}\n\n` +
    `Ne yapmak istersin?`,
    { 
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🧠 Zeka Seç', 'cmd_models'), Markup.button.callback('🎭 Rol Seç', 'cmd_roles')],
        [Markup.button.callback('🔍 Arama Yap', 'cmd_search_help'), Markup.button.callback('ℹ️ Yardım', 'cmd_help')]
      ])
    }
  );
});

// --- ACTION HANDLERS ---

bot.action('cmd_models', async (ctx) => {
  const user = await getUser(ctx.from!.id);
  const currentModelId = user ? user.current_model_id : defaultModelId;
  const buttons = availableModels.map((model, index) => {
    const isSelected = model.id === currentModelId;
    const label = isSelected ? `✅ ${model.name}` : model.name;
    return [Markup.button.callback(label, `sel:${index}`)];
  });
  await ctx.reply('🧠 <b>Zeka modelini seç:</b>', { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
  await ctx.answerCbQuery();
});

bot.action('cmd_roles', async (ctx) => {
  const user = await getUser(ctx.from!.id);
  const currentPersonaId = user ? user.current_persona_id : DEFAULT_PERSONA_ID;
  const personas = getPersonas();
  const buttons = personas.map((p) => {
    const isSelected = p.id === currentPersonaId;
    const label = isSelected ? `✅ ${p.name}` : p.name;
    return [Markup.button.callback(label, `set_role:${p.id}`)];
  });
  await ctx.reply('🎭 <b>Karakter seç:</b>', { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
  await ctx.answerCbQuery();
});

bot.action('cmd_search_help', async (ctx) => {
  await ctx.reply(
    `🔍 <b>İnternet Araması</b>\n\n` +
    `Bot üzerinden Google/Bing araması yapmak için:\n` +
    `👉 <code>/search &lt;konu&gt;</code> yazmalısın.\n\n` +
    `Örnek:\n` +
    `• /search dolar kaç tl`,
    { parse_mode: 'HTML' }
  );
  await ctx.answerCbQuery();
});

bot.action('cmd_help', async (ctx) => {
  await ctx.reply(
    `ℹ️ <b>Nexus Prime Rehberi</b>\n\n` +
    `🤖 <b>Modeller:</b> Farklı zeka seviyeleri.\n` +
    `🎭 <b>Roller:</b> Botun konuşma tarzı.\n` +
    `📸 <b>Görsel:</b> Fotoğraf analizi.\n` +
    `🔍 <b>Arama:</b> /search komutu ile internet araması.\n\n` +
    `Ayarlarını değiştirmek için /start menüsünü kullanabilirsin.`,
    { parse_mode: 'HTML' }
  );
  await ctx.answerCbQuery();
});

// --- SEÇİMLER ---
bot.action(/sel:(\d+)/, async (ctx) => {
  // @ts-ignore
  const index = parseInt(ctx.match[1], 10);
  const model = availableModels[index];
  if (model) {
    if (ctx.from) await updateUserModel(ctx.from.id, model.id);
    await ctx.answerCbQuery(`Model: ${model.name}`);
    await ctx.reply(`✅ <b>Model:</b> ${model.name}`, { parse_mode: 'HTML' });
  }
});

bot.action(/set_role:(.+)/, async (ctx) => {
  // @ts-ignore
  const roleId = ctx.match[1];
  const persona = getPersonaById(roleId);
  if (persona) {
    if (ctx.from) await updateUserPersona(ctx.from.id, roleId);
    await ctx.answerCbQuery(`Rol: ${persona.name}`);
    await ctx.reply(`✅ <b>Rol:</b> ${persona.name}`, { parse_mode: 'HTML' });
  }
});

// --- KOMUTLAR ---
bot.command('search', async (ctx) => {
  const query = ctx.message.text.split(' ').slice(1).join(' ');
  if (!query) return ctx.reply('⚠️ Konu yazın. Örn: <code>/search dolar</code>', { parse_mode: 'HTML' });

  const userId = ctx.from.id;
  const user = await getUser(userId);
  const currentModelId = user ? user.current_model_id : defaultModelId;

  await ctx.sendChatAction('typing');
  ctx.reply(`🔍 "<b>${query}</b>" aranıyor...`, { parse_mode: 'HTML' });

  try {
    const summary = await searchAndSummarize(query, userId, currentModelId);
    ctx.reply(summary, { parse_mode: 'HTML' });
  } catch (error) {
    ctx.reply("⚠️ Hata oluştu.");
  }
});

bot.on('photo', async (ctx) => {
  const userId = ctx.from.id;
  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  const caption = ctx.message.caption || "Bu resimde ne görüyorsun?";

  await ctx.sendChatAction('upload_photo');
  ctx.reply("🖼️ Resim inceleniyor...", { parse_mode: 'HTML' });

  try {
    const fileLink = await ctx.telegram.getFileLink(photo.file_id);
    const user = await getUser(userId);
    const currentModelId = user ? user.current_model_id : defaultModelId;
    
    const response = await askAI(userId, currentModelId, caption, fileLink.href);
    ctx.reply(response, { parse_mode: 'HTML' });
  } catch (error) {
    ctx.reply("⚠️ Hata.");
  }
});

bot.on('text', async (ctx) => {
  if (ctx.message.text.startsWith('/')) return;

  const userId = ctx.from.id;
  const user = await getUser(userId);
  const currentModelId = user ? user.current_model_id : defaultModelId;

  await ctx.sendChatAction('typing');

  try {
    const response = await askAI(userId, currentModelId, ctx.message.text);
    if (response.length > 4000) {
      const chunks = response.match(/.{1,4000}/g) || [];
      for (const chunk of chunks) await ctx.reply(chunk, { parse_mode: 'HTML' });
    } else {
      await ctx.reply(response, { parse_mode: 'HTML' });
    }
  } catch (error) {
    ctx.reply("⚠️ Hata.");
  }
});

initDatabase().then(async () => {
  console.log('Veritabanı hazır.');
  try {
    await bot.telegram.setMyCommands([
      { command: 'start', description: '🏠 Ana Menü' },
      { command: 'search', description: '🔍 Arama Yap' }
    ]);
  } catch (e) {}
  
  bot.launch().then(() => console.log('Bot başarıyla başlatıldı!'));
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
