// src/services/learning.ts
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const DATA_DIR = path.join(__dirname, '../../data/conversations');

// Klasörü oluştur
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface ConversationData {
  timestamp: string;
  userId: number;
  username?: string;
  model: string;
  userMessage: string;
  botResponse: string;
}

/**
 * Konuşmayı kaydeder ve Git'e canlı olarak yükler (Commit & Push)
 */
export async function saveAndLearn(data: ConversationData) {
  try {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filePath = path.join(DATA_DIR, `${date}.json`);

    let fileContent: ConversationData[] = [];

    // Mevcut dosyayı oku
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      try {
        fileContent = JSON.parse(raw);
      } catch (e) {
        fileContent = [];
      }
    }

    // Yeni veriyi ekle
    fileContent.push(data);

    // Dosyayı yaz
    fs.writeFileSync(filePath, JSON.stringify(fileContent, null, 2));

    // Git İşlemleri İPTAL EDİLDİ (Sistemi kilitlediği için)
    // syncToGit(date).catch(err => console.error("Git Sync Error:", err.message));

  } catch (error) {
    console.error("Learning Error:", error);
  }
}

/**
 * Git Senkronizasyonu (Devre Dışı)
 */
// async function syncToGit(date: string) { ... }
