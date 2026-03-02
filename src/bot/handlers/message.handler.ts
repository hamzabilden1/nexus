// src/bot/handlers/message.handler.ts
import { Telegraf } from 'telegraf';
import * as fs from 'fs';
import * as path from 'path';
import { getUser, addKnowledge, addReminder } from '../../services/database';
import { askAI } from '../../services/ai';
import { downloadFile, parseDocument } from '../../services/document';
import { defaultModelId } from '../../config/models';
import { sendLongMessage } from '../utils';
import { documentBuilderSessions, noteSessions, reminderSessions } from '../state';
import * as chrono from 'chrono-node';

export function setupMessageHandlers(bot: Telegraf) {
  bot.on('text', async (ctx) => {
    try {
      const text = ctx.message.text;
      const userId = ctx.from.id;

      // PDF Builder Session Check
      if (documentBuilderSessions.has(userId)) {
        documentBuilderSessions.get(userId)!.push({ type: 'text', content: text });
        return ctx.reply('➕ Metin eklendi.');
      }

      // Note Session Check
      if (noteSessions.has(userId)) {
          if (text === '/notkapat') {
              const session = noteSessions.get(userId)!;
              const content = session.lines.join('\n');
              await addKnowledge(userId, session.title, content);
              noteSessions.delete(userId);
              return ctx.reply(`✅ <b>"${session.title}"</b> başarıyla kaydedildi.`, { parse_mode: 'HTML' });
          }
          noteSessions.get(userId)!.lines.push(text);
          return ctx.reply('📝 <i>Not eklendi...</i>', { parse_mode: 'HTML' });
      }

      // Reminder Session Check
      if (reminderSessions.has(userId)) {
          const session = reminderSessions.get(userId)!;
          
          if (text === '/iptal') {
              reminderSessions.delete(userId);
              return ctx.reply('❌ Hatırlatıcı kurulumu iptal edildi.');
          }

          if (session.step === 'AWAITING_TITLE') {
              session.title = text;
              session.step = 'AWAITING_TIME';
              return ctx.reply(`📌 Başlık: <b>${text}</b>\n\nŞimdi lütfen zamanı söyleyin (Örn: "12.05.2026 14:30" veya "tomorrow at 5pm"):`, { parse_mode: 'HTML' });
          }
          
          if (session.step === 'AWAITING_TIME') {
              // Parse date using chrono-node
              let targetDate = chrono.parseDate(text);
              
              // Fallback manual parser for DD.MM.YYYY HH:MM
              if (!targetDate) {
                  const match = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{1,2})/);
                  if (match) {
                      targetDate = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]), parseInt(match[4]), parseInt(match[5]));
                  }
              }

              if (!targetDate || targetDate.getTime() < Date.now()) {
                  return ctx.reply('⚠️ Tarih anlaşılamadı veya geçmiş bir tarih girdiniz. Lütfen "GG.AA.YYYY SS:DD" formatında girin (Örn: 25.04.2026 15:00) veya /iptal yazın.');
              }

              await addReminder(userId, session.title!, targetDate.getTime());
              reminderSessions.delete(userId);
              return ctx.reply(`✅ Hatırlatıcı kuruldu!\n\n📌 <b>${session.title}</b>\n⏰ <b>${targetDate.toLocaleString('tr-TR')}</b>`, { parse_mode: 'HTML' });
          }
      }

      if (text.startsWith('/')) return;
      const user = await getUser(userId);
      await ctx.sendChatAction('typing');
      
      const progressMsg = await ctx.reply('⏳ İstek işleniyor...', { parse_mode: 'HTML' });
      const onProgress = async (msg: string) => {
          try {
              await ctx.telegram.editMessageText(ctx.chat.id, progressMsg.message_id, undefined, msg, { parse_mode: 'HTML' });
          } catch (e) { /* Ignore identical message errors */ }
      };

      const response = await askAI(userId, user?.current_model_id || defaultModelId, text, undefined, onProgress);
      
      try { await ctx.telegram.deleteMessage(ctx.chat.id, progressMsg.message_id); } catch(e) {}
      
      await sendLongMessage(ctx, response);
    } catch (error) {
      console.error("Text Handler Error:", error);
      await ctx.reply("❌ Bir hata oluştu, lütfen tekrar deneyin.");
    }
  });

  bot.on('photo', async (ctx) => {
    try {
      const userId = ctx.from.id;
      if (documentBuilderSessions.has(userId)) {
        const statusMsg = await ctx.reply('➕ Resim ekleniyor...');
        const session = documentBuilderSessions.get(userId)!;
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const fileLink = await ctx.telegram.getFileLink(photo.file_id);
        const tempDir = path.join(__dirname, '../../../data/tmp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const imageTempPath = path.join(tempDir, `img_${Date.now()}.jpg`);
        await downloadFile(fileLink.href, imageTempPath);
        session.push({ type: 'image', content: imageTempPath });
        return ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, undefined, '✅ Resim eklendi.');
      }
      // Fallback to normal analysis
      const user = await getUser(userId);
      await ctx.sendChatAction('upload_photo');
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      const fileLink = await ctx.telegram.getFileLink(photo.file_id);
      
      const progressMsg = await ctx.reply('⏳ İstek işleniyor...', { parse_mode: 'HTML' });
      const onProgress = async (msg: string) => {
          try {
              await ctx.telegram.editMessageText(ctx.chat.id, progressMsg.message_id, undefined, msg, { parse_mode: 'HTML' });
          } catch (e) { /* Ignore */ }
      };

      const response = await askAI(userId, user?.current_model_id || defaultModelId, ctx.message.caption || 'Bu resmi analiz et.', fileLink.href, onProgress);
      
      try { await ctx.telegram.deleteMessage(ctx.chat.id, progressMsg.message_id); } catch(e) {}
      
      await sendLongMessage(ctx, response);
    } catch (error) {
      console.error("Photo Handler Error:", error);
      await ctx.reply("❌ Resim işlenirken bir hata oluştu.");
    }
  });

  bot.on('document', async (ctx) => {
      const userId = ctx.from.id;
      const document = ctx.message.document;
      const user = await getUser(userId);
      
      const statusMsg = await ctx.reply(`📂 <b>${document.file_name}</b> indiriliyor ve analiz ediliyor...`, { parse_mode: 'HTML' });
      const onProgress = async (msg: string) => {
          try {
              await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, undefined, msg, { parse_mode: 'HTML' });
          } catch (e) { /* Ignore */ }
      };
      
      let filePath: string | null = null;
      try {
          const fileLink = await ctx.telegram.getFileLink(document.file_id);
          const tempDir = path.join(__dirname, '../../../data/tmp');
          if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
          
          filePath = path.join(tempDir, `${Date.now()}_${document.file_name}`);
          await downloadFile(fileLink.href, filePath);
          
          const content = await parseDocument(filePath);
          
          if (!content || content.startsWith('Dosya okunamadı') || content.startsWith('Desteklenmeyen')) {
              return ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, undefined, `❌ ${content}`);
          }

          const prompt = `Aşağıdaki belgenin içeriğini analiz et ve kısa bir özet sun. Eğer kullanıcı bir soru sorduysa ona cevap ver.\n\nBelge İçeriği:\n---\n${content.substring(0, 15000)}\n---\n\nAnaliz:`;
          const response = await askAI(userId, user?.current_model_id || defaultModelId, prompt, undefined, onProgress);
          
          if (ctx.chat) await ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id);
          await sendLongMessage(ctx, `📄 <b>Belge Analizi: ${document.file_name}</b>\n\n${response}`);
          
      } catch (error: any) {
          console.error("Document Handler Error:", error);
          if (ctx.chat) await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, undefined, `❌ Belge işlenirken bir hata oluştu: ${error.message}`);
      } finally {
          if (filePath && fs.existsSync(filePath)) {
              try { fs.unlinkSync(filePath); } catch (e) { console.error("Error deleting document temp file:", e); }
          }
      }
  });
}
