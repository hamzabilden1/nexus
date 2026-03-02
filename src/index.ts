// src/index.ts
import { Telegraf } from 'telegraf';
import * as dotenv from 'dotenv';
import express from 'express';

import { initDatabase } from './services/database';
import { setupBot } from './bot/bot';
import { startReminderService } from './services/reminders';

dotenv.config();

// --- EXPRESS SERVER ---
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is running! 🚀'));
app.listen(port, () => console.log(`Web server is listening on port ${port}`));

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');

// --- BOT INITIALIZATION ---
initDatabase().then(async () => {
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
  
  bot.launch().then(() => console.log('Bot başarıyla başlatıldı!'));
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

