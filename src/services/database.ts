// src/services/database.ts
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { defaultModelId } from '../config/models';

let db: Database | null = null;

export async function initDatabase() {
  db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  // 1. Users tablosunu oluştur
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id INTEGER PRIMARY KEY,
      username TEXT,
      current_model_id TEXT DEFAULT '${defaultModelId}',
      current_persona_id TEXT DEFAULT 'default',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Eksik sütunları ekle (Migration)
  try {
    await db.exec("ALTER TABLE users ADD COLUMN current_persona_id TEXT DEFAULT 'default';");
  } catch (e) {
    // Sütun zaten varsa hata verir, görmezden gel
  }

  // 3. Messages tablosunu oluştur
  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id INTEGER,
      role TEXT, -- 'user' or 'assistant'
      content TEXT,
      model_id TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(telegram_id) REFERENCES users(telegram_id)
    );
  `);

  console.log('Database initialized');
}

export async function getUser(telegramId: number) {
  if (!db) await initDatabase();
  return db?.get('SELECT * FROM users WHERE telegram_id = ?', telegramId);
}

export async function createUser(telegramId: number, username: string = '') {
  if (!db) await initDatabase();
  await db?.run(
    'INSERT OR IGNORE INTO users (telegram_id, username) VALUES (?, ?)',
    telegramId,
    username
  );
}

export async function updateUserModel(telegramId: number, modelId: string) {
  if (!db) await initDatabase();
  await db?.run(
    'UPDATE users SET current_model_id = ? WHERE telegram_id = ?',
    modelId,
    telegramId
  );
}

export async function updateUserPersona(telegramId: number, personaId: string) {
  if (!db) await initDatabase();
  await db?.run(
    'UPDATE users SET current_persona_id = ? WHERE telegram_id = ?',
    personaId,
    telegramId
  );
}

export async function saveMessage(telegramId: number, role: 'user' | 'assistant', content: string, modelId: string) {
  if (!db) await initDatabase();
  await db?.run(
    'INSERT INTO messages (telegram_id, role, content, model_id) VALUES (?, ?, ?, ?)',
    telegramId,
    role,
    content,
    modelId
  );
}

export async function getConversationHistory(telegramId: number, limit: number = 10) {
  if (!db) await initDatabase();
  const messages = await db?.all(
    'SELECT role, content FROM messages WHERE telegram_id = ? ORDER BY timestamp DESC LIMIT ?',
    telegramId,
    limit
  );
  return messages?.reverse().map((m: any) => ({ role: m.role, content: m.content }));
}
