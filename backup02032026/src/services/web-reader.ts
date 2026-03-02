// src/services/web-reader.ts
import axios from 'axios';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { askAI } from './ai';

export async function summarizeUrl(url: string, userId: number, modelId: string): Promise<string> {
    try {
        const response = await axios.get(url, { 
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        const dom = new JSDOM(response.data, { url });
        
        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        if (!article || !article.textContent) {
            return "⚠️ Bu web sayfasının ana içeriği okunamadı. Sayfa yapısı karmaşık veya metin içermiyor olabilir.";
        }
        
        const content = article.textContent;
        const maxLength = 25000; // Güvenlik payı
        const truncatedContent = content.substring(0, maxLength);

        const prompt = `
Aşağıdaki web sayfasının içeriğini dikkatlice analiz et ve kapsamlı bir özet çıkar. Önemli noktaları, ana fikirleri ve varsa kilit verileri vurgula.

URL: ${url}
Sayfa Başlığı: ${article.title}

İçerik:
---
${truncatedContent}
---

Lütfen bu içeriğe dayanarak bir özet oluştur.
        `;

        return await askAI(userId, modelId, prompt);

    } catch (error: any) {
        console.error("Web Reader Error:", error.message);
        if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
            return `❌ Web sayfasına ulaşılamadı (${url}). Zaman aşımı veya bağlantı hatası.`;
        }
        return "❌ Belirtilen URL okunurken bir hata oluştu. Lütfen geçerli bir web sayfası adresi girdiğinizden emin olun.";
    }
}
