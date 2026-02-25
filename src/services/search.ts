// src/services/search.ts
import axios from 'axios';
import * as cheerio from 'cheerio';
import { askAI } from './ai';
import * as prompts from '../config/prompts.json';

// --- GOOGLE NEWS RSS (GARANTİ YÖNTEM) ---
async function searchGoogleNews(query: string): Promise<any[]> {
  try {
    // RSS Feed URL'i
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=tr-TR&gl=TR&ceid=TR:tr`;
    
    const response = await axios.get(rssUrl, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
      }
    });

    const $ = cheerio.load(response.data, { xmlMode: true });
    const results: any[] = [];

    $('item').each((i, el) => {
      if (results.length >= 50) return; // 50 Haber

      const title = $(el).find('title').text();
      const link = $(el).find('link').text();
      const pubDate = $(el).find('pubDate').text();
      // RSS'de detaylı snippet olmaz ama başlık yeterlidir.
      // Description HTML içerir, onu temizleyebiliriz.
      const description = $(el).find('description').text().replace(/<[^>]+>/g, '');

      if (title && link) {
        results.push({
          source: 'Google News',
          title,
          link,
          snippet: `[${pubDate}] ${description}`
        });
      }
    });
    
    return results;
  } catch (e) {
    console.error("Google News RSS Error:", e);
    return [];
  }
}

// --- SEARX FETCH (Yedek) ---
const SEARX_INSTANCES = [
  'https://searx.be/search', 'https://searx.org/search', 'https://searx.space/search',
  'https://search.ononocloud.com/search', 'https://opnxng.com/search'
];

async function fetchFromSearx(instance: string, query: string): Promise<any[]> {
  try {
    const response = await axios.get(instance, {
      params: { q: query, format: 'json', language: 'tr-TR' },
      timeout: 3000
    });

    if (response.data.results) {
      return response.data.results.slice(0, 5).map((r: any) => ({
        source: `SearX-${new URL(instance).hostname}`,
        title: r.title,
        link: r.url,
        snippet: r.content || r.snippet
      }));
    }
    return [];
  } catch (e) {
    return [];
  }
}

/**
 * MEGA SEARCH (Google News RSS + SearX)
 */
export async function searchAndSummarize(query: string, userId: number, modelId: string): Promise<string> {
  console.log(`Searching MEGA SOURCES for: ${query}`);

  const googleNewsPromise = searchGoogleNews(query);
  const searxPromises = SEARX_INSTANCES.map(inst => fetchFromSearx(inst, query));

  const [googleNewsResults, ...searxResultsArrays] = await Promise.all([
    googleNewsPromise,
    ...searxPromises
  ]);

  const searxResults = searxResultsArrays.flat();
  const allResults = [...googleNewsResults, ...searxResults];
  
  // URL'ye göre tekrarları temizle
  const uniqueResults = new Map();
  allResults.forEach((item) => {
    if (!uniqueResults.has(item.link)) {
      uniqueResults.set(item.link, item);
    }
  });

  const finalResults = Array.from(uniqueResults.values());

  if (finalResults.length === 0) {
    return "Üzgünüm, hiçbir kaynaktan sonuç alamadım.";
  }

  console.log(`Found ${finalResults.length} unique results.`);
  
  // En iyi 80 sonucu al
  const topResults = finalResults.slice(0, 80)
    .map(r => `[${r.source}] ${r.title}\n🔗 ${r.link}\n📄 ${r.snippet}`)
    .join('\n\n');

  const searchPrompt = `
${prompts.search.instruction}
Kullanıcı Sorusu: "${query}"

Arama Sonuçları (Google Haberler + SearX - Toplam ${finalResults.length}):
${topResults}

Lütfen bu bilgileri sentezleyerek:
${prompts.search.requirements.map(req => "- " + req).join("\n")}
  `;

  return await askAI(userId, modelId, searchPrompt);
}
