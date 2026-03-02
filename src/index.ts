// src/index.ts
import { Telegraf } from 'telegraf';
import * as dotenv from 'dotenv';
import express from 'express';

import { initDatabase } from './services/database';
import { setupBot } from './bot/bot';
import { startReminderService } from './services/reminders';

dotenv.config();

// Çevresel Değişken Kontrolü (Hata ayıklama için)
const token = process.env.TELEGRAM_BOT_TOKEN;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!token || !supabaseUrl || !supabaseKey) {
  console.error("❌ HATA: Gerekli çevresel değişkenler (.env) eksik!");
  if (!token) console.error("- TELEGRAM_BOT_TOKEN bulunamadı.");
  if (!supabaseUrl) console.error("- SUPABASE_URL bulunamadı.");
  if (!supabaseKey) console.error("- SUPABASE_SERVICE_KEY bulunamadı.");
  process.exit(1);
}

// --- EXPRESS SERVER ---
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is running! 🚀'));
app.listen(port, () => console.log(`Web server is listening on port ${port}`));

const bot = new Telegraf(token);

// --- BOT INITIALIZATION ---
initDatabase().then(async () => {
  try {
    setupBot(bot);
    startReminderService(bot);

    await bot.telegram.setMyCommands([
      { command: 'start', description: '🏠 Ana Menü' },
      { command: 'profilim', description: '👤 Profil ve Ayarlar' },
      { command: 'help', description: 'ℹ️ Yardım ve Komutlar'},
      { command: 'search', description: '🔍 İnternet Araması' },
      { command: 'ozetle', description: '🌐 Web Sayfası Özeti' },
      { command: 'notal', description: '📝 Not Başlat' },
      { command: 'notkapat', description: '✅ Notu Kaydet' },
      { command: 'notlarim', description: '🗒️ Notları Listele' },
      { command: 'hatirlatici', description: '⏰ Hatırlatıcı Kur' },
      { command: 'pdf_baslat', description: '✍️ Adım Adım PDF Oluştur' },
    ]);
    
    bot.launch().then(() => console.log('Bot başarıyla başlatıldı! 🚀'));
  } catch (error) {
    console.error("❌ Bot başlatılırken kritik hata:", error);
    process.exit(1);
  }
}).catch(err => {
  console.error("❌ Veritabanı başlatılamadı:", err);
  process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

