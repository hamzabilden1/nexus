// src/services/reminders.ts
import { Telegraf } from 'telegraf';
import { getDueReminders, deleteKnowledge } from './database';

export function startReminderService(bot: Telegraf) {
  // Her 10 saniyede bir kontrol et (Daha hassas zamanlama için)
  setInterval(async () => {
    try {
      const now = Date.now();
      const dueReminders = await getDueReminders(now);
      
      for (const reminder of dueReminders) {
        // Kullanıcıya mesaj gönder
        await bot.telegram.sendMessage(
          reminder.telegram_id, 
          `⏰ <b>Hatırlatıcı Zamanı!</b>\n\n📌 ${reminder.value}`, 
          { parse_mode: 'HTML' }
        ).catch(e => console.error(`Failed to send reminder to ${reminder.telegram_id}:`, e));
        
        // Gönderilen hatırlatıcıyı sil
        await deleteKnowledge(reminder.telegram_id, reminder.key);
        console.log(`🔔 Reminder sent and deleted for user ${reminder.telegram_id}`);
      }
    } catch (e) {
      console.error("Reminder check error:", e);
    }
  }, 10000);
}