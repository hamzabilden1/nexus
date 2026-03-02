// src/bot/commands/core.commands.ts
import { Telegraf, Markup, Context } from 'telegraf';
import { availableModels, defaultModelId } from '../../config/models';
import { getUser } from '../../services/database';
import { getPersonaById, DEFAULT_PERSONA_ID } from '../../services/personas';

export function setupCoreCommands(bot: Telegraf) {
  bot.start(async (ctx) => {
    const user = await getUser(ctx.from.id);
    const modelName = availableModels.find(m => m.id === (user?.current_model_id || defaultModelId))?.name || "Bilinmiyor";
    const persona = getPersonaById(user?.current_persona_id || DEFAULT_PERSONA_ID);
    await ctx.reply(
      `👋 <b>Merhaba ${ctx.from.first_name}! Ben Nexus Prime.</b>\n\n` +
      `🤖 <b>Mevcut Model:</b> ${modelName}\n` +
      `🎭 <b>Mevcut Rol:</b> ${persona?.name || 'Standart'}\n\n` +
      `Tüm komutlar için /help yazabilirsiniz.`,
      { 
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('👤 Profilim', 'cmd_profile')],
          [Markup.button.callback('☀️ Hava Durumu', 'btn_weather'), Markup.button.callback('💱 Döviz Çevir', 'btn_currency')]
        ])
      }
    );
  });

  bot.command('profilim', async (ctx) => {
    const user = await getUser(ctx.from.id);
    const modelName = availableModels.find(m => m.id === (user?.current_model_id || defaultModelId))?.name || "Bilinmiyor";
    const persona = getPersonaById(user?.current_persona_id || DEFAULT_PERSONA_ID);

    await ctx.reply(
      `👤 <b>Profilim ve Ayarlar</b>\n\n` +
      `<b>Model:</b> ${modelName}\n` +
      `<b>Rol:</b> ${persona?.name || 'Standart'}`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🧠 Zeka Değiştir', 'cmd_models'), Markup.button.callback('🎭 Rol Değiştir', 'cmd_roles')],
          [Markup.button.callback('🗒️ Notlarımı Gör', 'cmd_view_notes'), Markup.button.callback('⏰ Hatırlatıcı Kur', 'cmd_set_reminder')],
          [Markup.button.callback('🧹 Verilerimi Temizle', 'cmd_clear_data')]
        ])
      }
    );
  });

  bot.help((ctx) => {
      ctx.reply(
      `ℹ️ <b>Nexus Prime Rehberi</b>\n\n` +
      `<b>Temel Yetenekler:</b>\n` +
      `• <code>/search &lt;konu&gt;</code>: İnternette arama yapar.\n` +
      `• <code>/ozetle &lt;url&gt;</code>: Web sayfasını özetler.\n` +
      `• Resim gönderirseniz analiz eder.\n` +
      `• Belge (.pdf, .docx, .xlsx, .txt) gönderirseniz okur.\n\n` +
      `<b>Kolay Hafıza ve Notlar:</b>\n` +
      `• <code>/notal</code>: Yeni bir not başlatır.\n` +
      `• <code>/notkapat</code>: Not almayı bitirir ve kaydeder.\n` +
      `• <code>/hatirlatici</code>: Adım adım hatırlatıcı kurmanızı sağlar.\n` +
      `• <code>/profilim</code>: Notları ve ayarları yönetin.\n\n` +
      `<b>Akıllı Asistan:</b>\n` +
      `• Komut kullanmanıza gerek yok! Bana <i>"İstanbul'da hava nasıl?"</i> veya <i>"100 dolar kaç TL?"</i> gibi sorular sorabilirsiniz.\n\n` +
      `<b>Dışa Aktarma:</b>\n` +
      `• <code>/pdf</code>, <code>/docx</code>: Son yanıtı belgeye dönüştürür.`,
      { parse_mode: 'HTML' }
    );
  });
}

