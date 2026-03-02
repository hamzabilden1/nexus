// src/bot/commands/tool.commands.ts
import { Telegraf } from 'telegraf';
import { getUser, getKnowledge, listKnowledge, deleteKnowledge, deleteUserCompletely } from '../../services/database';
import { searchAndSummarize } from '../../services/search';
import { summarizeUrl } from '../../services/web-reader';
import { defaultModelId } from '../../config/models';
import { sendLongMessage } from '../utils';
import { noteSessions, reminderSessions } from '../state';

export function setupToolCommands(bot: Telegraf) {
  bot.command('search', async (ctx) => {
    try {
      const query = ctx.message.text.split(' ').slice(1).join(' ');
      if (!query) return ctx.reply('⚠️ Konu yazın. Örn: `/search dolar`');
      const user = await getUser(ctx.from.id);
      await ctx.sendChatAction('typing');
      
      const progressMsg = await ctx.reply('⏳ İstek işleniyor...', { parse_mode: 'HTML' });
      const onProgress = async (msg: string) => {
          try {
              await ctx.telegram.editMessageText(ctx.chat.id, progressMsg.message_id, undefined, msg, { parse_mode: 'HTML' });
          } catch (e) { /* Ignore */ }
      };

      const summary = await searchAndSummarize(query, ctx.from.id, user?.current_model_id || defaultModelId, onProgress);
      
      try { await ctx.telegram.deleteMessage(ctx.chat.id, progressMsg.message_id); } catch(e) {}
      
      await sendLongMessage(ctx, summary);
    } catch (error) {
      console.error("Search Command Error:", error);
      await ctx.reply("❌ Arama yapılırken bir hata oluştu.");
    }
  });

  bot.command('ozetle', async (ctx) => {
      try {
          const url = ctx.message.text.split(' ').slice(1)[0];
          if (!url || !url.startsWith('http')) return ctx.reply('Lütfen geçerli bir URL girin. Örnek: `/ozetle https://...`');
          const user = await getUser(ctx.from.id);
          const statusMsg = await ctx.reply(`🌐 <b>${url}</b> okunuyor...`, { parse_mode: 'HTML' });
          const summary = await summarizeUrl(url, ctx.from.id, user?.current_model_id || defaultModelId);
          if (ctx.chat) await ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id);
          await sendLongMessage(ctx, summary);
      } catch (error: any) {
          console.error("Ozetle Command Error:", error);
          await ctx.reply("❌ Sayfa özetlenirken bir hata oluştu veya işlem zaman aşımına uğradı.");
      }
  });

  bot.command('notal', (ctx) => {
      const parts = ctx.message.text.split(' ').slice(1);
      const title = parts.length > 0 ? parts.join(' ') : `Not_${Date.now()}`;
      noteSessions.set(ctx.from.id, { title, lines: [] });
      ctx.reply(`📝 <b>"${title}"</b> isimli not başlatıldı.\n\nBundan sonra yazacağınız her mesaj bu nota eklenecektir.\nBitirmek ve kaydetmek için /notkapat yazın.`, { parse_mode: 'HTML' });
  });

  bot.command('notkapat', async (ctx) => {
      // Bu kısım message.handler.ts içerisinde text eventi tarafından yakalanacak ama komut olarak da burada kalsın
      ctx.reply('Lütfen /notkapat komutunu not alırken kullanın.');
  });

  bot.command('hatirlatici', async (ctx) => {
      reminderSessions.set(ctx.from.id, { step: 'AWAITING_TITLE' });
      await ctx.reply('⏰ <b>Yeni Hatırlatıcı</b>\n\nLütfen hatırlatıcının başlığını veya ne hatırlatmamı istediğinizi yazın:', { parse_mode: 'HTML' });
  });

  bot.command('getir', async (ctx) => {
      try {
          const key = ctx.message.text.replace('/getir', '').trim();
          if (!key) return ctx.reply('⚠️ Anahtar belirtmediniz. Örnek: /getir Başlık');
          const result = await getKnowledge(ctx.from.id, key);
          if (result) await ctx.reply(`<b>${key}:</b>\n${result.value}`, { parse_mode: 'HTML' });
          else await ctx.reply(`🚫 **${key}** adında bir not bulunamadı.`);
      } catch (error) {
          await ctx.reply("❌ Veri getirilirken bir hata oluştu.");
      }
  });

  bot.command('notlarim', async (ctx) => {
      try {
          const notes = await listKnowledge(ctx.from.id);
          const filteredNotes = notes.filter(n => !n.key.startsWith('reminder:'));
          if (!filteredNotes || filteredNotes.length === 0) return ctx.reply('Hiç notunuz yok.');
          const noteList = filteredNotes.map(n => `- <code>${n.key}</code>`).join('\n');
          await ctx.reply(`<b>Kaydedilen Notlar:</b>\n${noteList}\n\nİçeriği görmek için /getir <başlık> yazabilirsiniz.`, { parse_mode: 'HTML' });
      } catch (error) {
          await ctx.reply("❌ Notlar listelenirken bir hata oluştu.");
      }
  });

  bot.command('notu_sil', async (ctx) => {
      try {
          const key = ctx.message.text.replace('/notu_sil', '').trim();
          if (!key) return ctx.reply('⚠️ Silinecek notun anahtarını belirtin.');
          await deleteKnowledge(ctx.from.id, key);
          await ctx.reply(`🗑️ **${key}** notu silindi.`);
      } catch (error) {
          await ctx.reply("❌ Not silinirken bir hata oluştu.");
      }
  });

  bot.command('cc', async (ctx) => {
      try {
          await deleteUserCompletely(ctx.from.id);
          await ctx.reply('🧹 <b>Sohbet geçmişi, hafıza ve tüm verileriniz kalıcı olarak silindi.</b>', { parse_mode: 'HTML' });
      } catch (e) {
          await ctx.reply('❌ Temizlik işlemi sırasında bir hata oluştu.');
      }
  });
}
