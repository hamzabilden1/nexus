// src/bot/actions/ui.actions.ts
import { Telegraf, Markup } from 'telegraf';
import { availableModels, defaultModelId } from '../../config/models';
import { getUser, updateUserModel, updateUserPersona, listKnowledge, deleteKnowledge, deleteUserCompletely } from '../../services/database';
import { getPersonas, getPersonaById, DEFAULT_PERSONA_ID } from '../../services/personas';
import { reminderSessions } from '../state';

export function setupUIActions(bot: Telegraf) {
  bot.action('btn_weather', async (ctx) => {
    await ctx.reply('🌤️ Hangi şehrin hava durumunu öğrenmek istersiniz? Örn: <i>"İstanbul hava durumu"</i>', { parse_mode: 'HTML' });
    await ctx.answerCbQuery();
  });

  bot.action('btn_currency', async (ctx) => {
    await ctx.reply('💱 Hangi para birimini çevirmek istersiniz? Örn: <i>"100 USD kaç TL?"</i>', { parse_mode: 'HTML' });
    await ctx.answerCbQuery();
  });

  bot.action('cmd_profile', async (ctx) => {
    const user = await getUser(ctx.from!.id);
    const modelName = availableModels.find(m => m.id === (user?.current_model_id || defaultModelId))?.name || "Bilinmiyor";
    const persona = getPersonaById(user?.current_persona_id || DEFAULT_PERSONA_ID);

    await ctx.editMessageText(
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
    await ctx.answerCbQuery();
  });

  bot.action('cmd_view_notes', async (ctx) => {
      try {
          const notes = await listKnowledge(ctx.from!.id);
          const filteredNotes = notes.filter(n => !n.key.startsWith('reminder:'));
          if (!filteredNotes || filteredNotes.length === 0) {
              await ctx.reply('Hiç notunuz yok. /notal yazarak yeni bir not başlatabilirsiniz.');
              return ctx.answerCbQuery();
          }
          
          const buttons = filteredNotes.map(n => [Markup.button.callback(`🗑️ Sil: ${n.key}`, `del_note:${n.key}`)]);
          
          const noteList = filteredNotes.map(n => `- <b>${n.key}</b>`).join('\n');
          await ctx.reply(`<b>Kaydedilen Notlar:</b>\n${noteList}\n\nİçeriklerini görmek için /getir <başlık> yazabilirsiniz.`, { 
              parse_mode: 'HTML',
              ...Markup.inlineKeyboard(buttons)
          });
          await ctx.answerCbQuery();
      } catch (error) {
          await ctx.reply("❌ Notlar listelenirken bir hata oluştu.");
      }
  });

  bot.action(/del_note:(.+)/, async (ctx) => {
      try {
          const key = ctx.match[1];
          await deleteKnowledge(ctx.from!.id, key);
          await ctx.answerCbQuery(`🗑️ ${key} silindi.`);
          await ctx.editMessageText(`✅ <b>${key}</b> başarıyla silindi.`, { parse_mode: 'HTML' });
      } catch (error) {
          await ctx.reply("❌ Not silinirken bir hata oluştu.");
      }
  });

  bot.action('cmd_set_reminder', async (ctx) => {
      reminderSessions.set(ctx.from!.id, { step: 'AWAITING_TITLE' });
      await ctx.reply('⏰ <b>Yeni Hatırlatıcı</b>\n\nLütfen hatırlatıcının başlığını veya ne hatırlatmamı istediğinizi yazın:', { parse_mode: 'HTML' });
      await ctx.answerCbQuery();
  });

  bot.action('cmd_clear_data', async (ctx) => {
      try {
          await deleteUserCompletely(ctx.from!.id);
          await ctx.reply('🧹 <b>Sohbet geçmişi, hafıza ve tüm verileriniz kalıcı olarak silindi.</b>', { parse_mode: 'HTML' });
          await ctx.answerCbQuery("Veriler temizlendi.");
      } catch (e) {
          await ctx.reply('❌ Temizlik işlemi sırasında bir hata oluştu.');
      }
  });

  bot.action('cmd_models', async (ctx) => {
    const user = await getUser(ctx.from!.id);
    const currentModelId = user?.current_model_id || defaultModelId;
    const buttons = availableModels.map((model, index) => {
      const isSelected = model.id === currentModelId;
      const label = isSelected ? `✅ ${model.name}` : model.name;
      return [Markup.button.callback(label, `sel_mod:${index}`)];
    });
    buttons.push([Markup.button.callback('⬅️ Geri Dön', 'cmd_profile')]);
    await ctx.editMessageText('🧠 <b>Zeka modelini seç:</b>', { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    await ctx.answerCbQuery();
  });

  bot.action('cmd_roles', async (ctx) => {
    const user = await getUser(ctx.from!.id);
    const currentPersonaId = user?.current_persona_id || DEFAULT_PERSONA_ID;
    const personas = getPersonas();
    const buttons = personas.map((p) => {
      const isSelected = p.id === currentPersonaId;
      const label = isSelected ? `✅ ${p.name}` : p.name;
      return [Markup.button.callback(label, `set_role:${p.id}`)];
    });
    buttons.push([Markup.button.callback('⬅️ Geri Dön', 'cmd_profile')]);
    await ctx.editMessageText('🎭 <b>Karakter seç:</b>', { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    await ctx.answerCbQuery();
  });

  bot.action('cmd_help', async (ctx) => {
      await ctx.reply(
          `ℹ️ <b>Nexus Prime Rehberi</b>\n\n` +
          `🤖 <b>Modeller:</b> Farklı zeka seviyeleri ve yetenekler.\n` +
          `🎭 <b>Roller:</b> Botun konuşma tarzı ve uzmanlığı.\n` +
          `📸 <b>Görsel/Belge:</b> Gönderdiğiniz dosyalar analiz edilir.\n` +
          `🔍 <b>Arama:</b> /search komutu ile canlı internet araması.\n\n` +
          `Daha fazla detay için /help yazabilirsiniz.`,
          { parse_mode: 'HTML' }
      );
      await ctx.answerCbQuery();
  });

  bot.action(/sel_mod:(\d+)/, async (ctx) => {
    const index = parseInt(ctx.match[1], 10);
    const model = availableModels[index];
    if (model && ctx.from) {
      await updateUserModel(ctx.from.id, model.id);
      await ctx.answerCbQuery(`Model: ${model.name}`).catch(() => {});
      await ctx.editMessageText(`✅ <b>Model değiştirildi:</b> ${model.name}`, { 
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Profile Dön', 'cmd_profile')]])
      }).catch(() => {});
    }
  });

  bot.action(/set_role:(.+)/, async (ctx) => {
    const roleId = ctx.match[1];
    const persona = getPersonaById(roleId);
    if (persona && ctx.from) {
      await updateUserPersona(ctx.from.id, roleId);
      await ctx.answerCbQuery(`Rol: ${persona.name}`).catch(() => {});
      await ctx.editMessageText(`✅ <b>Rol değiştirildi:</b> ${persona.name}`, { 
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Profile Dön', 'cmd_profile')]])
      }).catch(() => {});
    }
  });
}
