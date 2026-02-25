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

    // Git İşlemleri (Arka Planda)
    // await kullanmıyoruz ki bot kullanıcıyı bekletmesin.
    syncToGit(date).catch(err => console.error("Git Sync Error:", err.message));

  } catch (error) {
    console.error("Learning Error:", error);
  }
}

/**
 * Git Senkronizasyonu (Add -> Commit -> Push)
 */
async function syncToGit(date: string) {
  const projectRoot = path.join(__dirname, '../../');
  
  try {
    // 1. Dosyaları ekle
    await execAsync(`git add data/conversations/${date}.json`, { cwd: projectRoot });
    
    // 2. Commit yap
    const commitMsg = `Live Learning: ${new Date().toLocaleTimeString()} - User Interaction`;
    await execAsync(`git commit -m "${commitMsg}"`, { cwd: projectRoot });
    
    // 3. Push yap (Eğer remote varsa)
    console.log("⬆️ Pushing data to GitHub...");
    await execAsync(`git push origin main`, { cwd: projectRoot });
    console.log("✅ Data synced to GitHub successfully.");

  } catch (e: any) {
    // Commit edecek bir şey yoksa veya push hatası varsa
    if (e.message.includes('nothing to commit')) return;
    console.warn("Git Sync Warning:", e.message);
  }
}
