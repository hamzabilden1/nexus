// src/bot/commands/document.commands.ts
import { Telegraf, Context } from 'telegraf';
import * as fs from 'fs';
import { getLastAssistantMessage } from '../../services/database';
import { fileGenerator } from '../../services/generator';
import { documentBuilderSessions } from '../state';

export function setupDocumentCommands(bot: Telegraf) {
  const handleFileGeneration = async (ctx: Context, format: 'pdf' | 'docx') => {
    const lastMessage = await getLastAssistantMessage(ctx.from!.id);
    if (!lastMessage) return ctx.reply("⚠️ Dönüştürülecek bir mesaj bulunamadı.");
    const statusMsg = await ctx.reply(`📄 ${format.toUpperCase()} oluşturuluyor...`);
    let filePath: string | null = null;
    try {
      const filename = `rapor_${Date.now()}.${format}`;
      if (format === 'pdf') filePath = await fileGenerator.createPDF(lastMessage, filename);
      else filePath = await fileGenerator.createDOCX(lastMessage, filename);
      await ctx.replyWithDocument({ source: filePath, filename });
      if (ctx.chat) await ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id);
    } catch (error) {
      if (ctx.chat) await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, undefined, '❌ Dosya oluşturulurken hata oluştu.');
    } finally {
      if (filePath && fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { console.error("Error deleting temp file:", e); }
      }
    }
  };

  bot.command('pdf', (ctx) => handleFileGeneration(ctx, 'pdf'));
  bot.command('docx', (ctx) => handleFileGeneration(ctx, 'docx'));

  // 4. PDF Builder Commands
  bot.command('pdf_baslat', (ctx) => {
    documentBuilderSessions.set(ctx.from.id, []);
    ctx.reply("✅ Yeni PDF belgesi oluşturma oturumu başlatıldı. Metin veya resim göndererek içeriği oluşturun. Bitince /pdf_bitir komutunu kullanın.");
  });

  bot.command('pdf_bitir', async (ctx) => {
    const sessionContent = documentBuilderSessions.get(ctx.from.id);
    if (!sessionContent || sessionContent.length === 0) return ctx.reply("⚠️ PDF'e eklenecek içerik yok.");
    const statusMsg = await ctx.reply("⏳ PDF oluşturuluyor...");
    try {
      const filename = `belge_${Date.now()}.pdf`;
      const generatedPdfPath = await fileGenerator.createMultiPartPDF(sessionContent, filename);
      await ctx.replyWithDocument({ source: generatedPdfPath, filename });
      // Cleanup
      sessionContent.forEach(block => {
        if (block.type === 'image' && fs.existsSync(block.content)) fs.unlinkSync(block.content);
      });
      documentBuilderSessions.delete(ctx.from.id);
      fs.unlinkSync(generatedPdfPath);
      if (ctx.chat) await ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id);
    } catch (error) {
      if (ctx.chat) await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, undefined, "❌ PDF oluşturulurken bir hata oluştu.");
    }
  });

  bot.command('pdf_iptal', (ctx) => {
      const sessionContent = documentBuilderSessions.get(ctx.from.id);
      if (!sessionContent) return ctx.reply("⚠️ Aktif bir oturum yok.");
      sessionContent.forEach(block => {
        if (block.type === 'image' && fs.existsSync(block.content)) fs.unlinkSync(block.content);
      });
      documentBuilderSessions.delete(ctx.from.id);
      ctx.reply("❌ PDF oluşturma oturumu iptal edildi.");
  });
}
