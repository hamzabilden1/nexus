// src/index.ts
import { Telegraf } from 'telegraf';
import * as dotenv from 'dotenv';
import express from 'express';

import { initDatabase } from './services/database';
import { setupBot } from './bot/bot';
import { startReminderService } from './services/reminders';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!token || !supabaseUrl || !supabaseKey) {
  console.error("❌ HATA: Gerekli çevresel değişkenler (.env) eksik!");
  process.exit(1);
}

const app = express();
const port = process.env.PORT || 3000;

async function startServer() {
  app.get('/', (req, res) => res.send('Bot is running! 🚀'));
  app.listen(port, () => console.log(`[SERVER] Web server listening on port ${port}`));
}

async function initializeApp() {
  try {
    await initDatabase();
    console.log('✅ Veritabanı bağlantısı başarılı.');

    const bot = new Telegraf(token!);
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

    await bot.launch();
    console.log('🚀 Bot başarıyla başlatıldı!');

    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));

  } catch (error) {
    console.error("❌ Uygulama başlatılırken kritik hata:", error);
    process.exit(1);
  }
}

startServer();
initializeApp();

