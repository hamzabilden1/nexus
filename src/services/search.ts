// src/services/search.ts
import axios from 'axios';
import * as cheerio from 'cheerio';
import { search as ddgSearch, SearchTimeType } from 'duck-duck-scrape';
import { askAI } from './ai';
import * as prompts from '../config/prompts.json';

// --- KONFİGÜRASYON ---
const SEARX_INSTANCES = [
  'https://searx.be/search',
  'https://opnxng.com/search',
  'https://searx.work/search',
  'https://priv.au/search'
];

// Zaman parametresi ayrıştırma (Yapay Zeka ile)
async function analyzeSearchQuery(query: string): Promise<{ cleanQuery: string, timeType: SearchTimeType }> {
  try {
    const keys = process.env.OPENROUTER_API_KEYS ? process.env.OPENROUTER_API_KEYS.split(',').map(k => k.trim()) : [];
    const key = keys[Math.floor(Math.random() * keys.length)];
    
    const now = new Date();
    // Yılı 2026 olarak sabitledik
    now.setFullYear(2026);
    const formattedDate = now.toLocaleDateString('tr-TR');
    
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'stepfun/step-3.5-flash:free',
      messages: [
        { role: 'system', content: `Sen bir arama analizcisisin. Bugünün tarihi: ${formattedDate}. Kullanıcının arama cümlesinden en ideal arama anahtar kelimelerini (query) ve istenen zaman aralığını (time) çıkar.
Zaman aralığı şunlardan biri olmalı:
"d" -> Sadece son 1 gün (bugün, son dakika, yeni, son 24 saat, güncel olaylar)
"w" -> Sadece son 1 hafta (bu hafta, son günlerde)
"m" -> Sadece son 1 ay (bu ay, son zamanlarda, geçtiğimiz haftalarda)
"a" -> Tümü (zaman belirtilmemişse)

LÜTFEN SADECE VE SADECE GEÇERLİ BİR JSON FORMATI DÖNDÜR. Markdown kullanma, başka hiçbir açıklama yazma.
Örnek Yanıt: {"query": "chatgpt 4.5 özellikleri", "time": "w"}` },
        { role: 'user', content: query }
      ]
    }, {
      headers: { 'Authorization': `Bearer ${key}` },
      timeout: 10000
    });
    
    let content = response.data.choices[0].message.content.trim();
    if (content.startsWith('```json')) content = content.replace(/```json/g, '').replace(/```/g, '').trim();
    if (content.startsWith('```')) content = content.replace(/```/g, '').trim();
    
    const parsed = JSON.parse(content);
    let timeType = SearchTimeType.ALL;
    if (parsed.time === 'd') timeType = SearchTimeType.DAY;
    if (parsed.time === 'w') timeType = SearchTimeType.WEEK;
    if (parsed.time === 'm') timeType = SearchTimeType.MONTH;
    
    return { cleanQuery: parsed.query || query, timeType };
  } catch (e) {
    console.error("AI Query Analysis Failed:", e);
    // Basit yedek (Fallback) yöntem
    let timeType = SearchTimeType.ALL;
    const q = query.toLowerCase();
    if (q.includes('bugün') || q.includes('son 24 saat') || q.includes('son durum') || q.includes('son dakika')) timeType = SearchTimeType.DAY;
    else if (q.includes('bu hafta') || q.includes('son 1 hafta') || q.includes('son hafta')) timeType = SearchTimeType.WEEK;
    else if (q.includes('bu ay') || q.includes('son 1 ay') || q.includes('son ay')) timeType = SearchTimeType.MONTH;
    
    return { cleanQuery: query, timeType };
  }
}

function getGoogleNewsTimeParam(timeType: SearchTimeType): string {
    switch(timeType) {
        case SearchTimeType.DAY: return '+when:1d';
        case SearchTimeType.WEEK: return '+when:7d';
        case SearchTimeType.MONTH: return '+when:30d';
        default: return ''; // ALL
    }
}

// --- SCRAPERS ---

// 1. Google News Scraper
async function searchGoogleNews(query: string, timeType: SearchTimeType): Promise<any[]> {
  try {
    const timeParam = getGoogleNewsTimeParam(timeType);
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}${timeParam}&hl=tr-TR&gl=TR&ceid=TR:tr`;
    const response = await axios.get(url, { timeout: 8000 });
    const $ = cheerio.load(response.data, { xmlMode: true });
    const results: any[] = [];
    $('item').each((i, el) => {
      if (i >= 20) return; // Google News'ten en fazla 20 haber al
      const title = $(el).find('title').text();
      const link = $(el).find('link').text();
      const pubDate = $(el).find('pubDate').text();
      const description = $(el).find('description').text().replace(/<[^>]+>/g, '');
      if (title && link) {
        results.push({ source: 'Google News', title, link, snippet: `[${pubDate}] ${description}` });
      }
    });
    return results;
  } catch (e) { 
      console.error("Google News fetch failed", e);
      return []; 
  }
}

// 2. DuckDuckGo Scraper
async function searchDuckDuckGo(query: string, timeType: SearchTimeType): Promise<any[]> {
  try {
    const searchResults = await ddgSearch(query, { safeSearch: 0, time: timeType });
    if (searchResults.results) {
      return searchResults.results.slice(0, 20).map((r: any) => ({
        source: 'DuckDuckGo', title: r.title, link: r.url, snippet: r.description
      }));
    }
    return [];
  } catch (e) { 
      console.error("DuckDuckGo fetch failed", e);
      return []; 
  }
}

// 3. SearX Scraper (Çoklu Instance Destekli)
async function fetchFromSearx(query: string, timeType: SearchTimeType): Promise<any[]> {
  const targets = SEARX_INSTANCES.slice(0, 2);
  let timeStr = 'None';
  switch(timeType) {
      case SearchTimeType.DAY: timeStr = 'day'; break;
      case SearchTimeType.WEEK: timeStr = 'week'; break;
      case SearchTimeType.MONTH: timeStr = 'month'; break;
  }

  const tasks = targets.map(async (instance) => {
    try {
      const response = await axios.get(instance, {
        params: { q: query, format: 'json', language: 'tr-TR', time_range: timeStr },
        timeout: 6000
      });
      if (response.data && response.data.results) {
        return response.data.results.slice(0, 15).map((r: any) => ({
          source: `SearX (${new URL(instance).hostname})`,
          title: r.title,
          link: r.url,
          snippet: r.content || r.snippet
        }));
      }
    } catch (e) { /* Hata alan instance'ı pas geç */ }
    return [];
  });

  const results = await Promise.all(tasks);
  return results.flat();
}

// --- ANA MOTOR ---
export async function searchAndSummarize(query: string, userId: number, _modelId: string, onProgress?: (msg: string) => Promise<void>): Promise<string> {
  console.log(`\n=========================================`);
  console.log(`🚀 [SEARCH START] Kullanıcı Sorgusu: "${query}"`);
  
  if (onProgress) await onProgress('🧠 Arama terimleri ve zaman aralığı analiz ediliyor...');

  const analysis = await analyzeSearchQuery(query);
  const timeType = analysis.timeType;
  const searchTerms = analysis.cleanQuery;
  
  console.log(`🧠 [AI SEARCH ANALYSIS] Filtrelenmiş Sorgu: "${searchTerms}", Zaman Aralığı: ${timeType}`);
  
  if (onProgress) await onProgress(`🌐 İnternet üzerinde aranıyor: <i>"${searchTerms}"</i>...`);

  // Tüm kaynaklardan paralel arama yap
  console.log(`🌐 [SCRAPERS] Tüm motorlara istek atılıyor...`);
  const [ddgResults, gNewsResults, searxResults] = await Promise.allSettled([
    searchDuckDuckGo(searchTerms, timeType),
    searchGoogleNews(searchTerms, timeType),
    fetchFromSearx(searchTerms, timeType)
  ]);

  // Sadece başarılı olan sonuçları birleştir
  let allResults: any[] = [];
  if (ddgResults.status === 'fulfilled') allResults.push(...ddgResults.value);
  if (gNewsResults.status === 'fulfilled') allResults.push(...gNewsResults.value);
  if (searxResults.status === 'fulfilled') allResults.push(...searxResults.value);
  
  console.log(`✅ [SCRAPERS] İlk aşama tamamlandı. Bulunan ham sonuç sayısı: ${allResults.length}`);

  // Eğer spesifik zaman aralığı istendiyse ama sonuç az geldiyse, zaman kısıtlamasını kaldırıp tekrar dene
  if (allResults.length < 5 && timeType !== SearchTimeType.ALL) {
      console.log(`⚠️ [FALLBACK] Yeterli sonuç bulunamadı (${allResults.length}), kısıtlamasız tekrar aranıyor...`);
      if (onProgress) await onProgress('⚠️ Yeterli güncel sonuç bulunamadı, daha geniş bir arama yapılıyor...');
      const fallbackResults = await Promise.allSettled([
          searchDuckDuckGo(searchTerms, SearchTimeType.ALL),
          searchGoogleNews(searchTerms, SearchTimeType.ALL)
      ]);
      if (fallbackResults[0].status === 'fulfilled') allResults.push(...fallbackResults[0].value);
      if (fallbackResults[1].status === 'fulfilled') allResults.push(...fallbackResults[1].value);
  }

  // Sonuçları birleştir ve linke göre tekilleştir
  const uniqueResults = [...new Map(allResults.map(item => [item.link, item])).values()];

  if (uniqueResults.length === 0) {
    console.log(`❌ [SEARCH END] Hiçbir kaynaktan sonuç dönmedi.`);
    return "Maalesef hiçbir kaynaktan (SearX, DDG, Google) sonuç dönmedi.";
  }

  // AI için veriyi hazırla
  const maxResults = 60;
  const slicedResults = uniqueResults.slice(0, maxResults);
  const contextData = slicedResults.map((r, i) => 
    `${i+1}. [${r.source}] ${r.title}\nURL: ${r.link}\nÖzet: ${r.snippet}`
  ).join('\n\n');

  console.log(`📊 [RESULTS] Toplam ${uniqueResults.length} benzersiz sonuç bulundu, ${slicedResults.length} tanesi AI'ya gönderiliyor.`);
  if (onProgress) await onProgress(`📊 ${slicedResults.length} sonuç başarıyla toplandı. Sentezleniyor...`);

  // Zaman aralığı bilgisi için prompt'a not ekle
  const timeContextMsg = timeType !== SearchTimeType.ALL ? `\n(Not: Kullanıcı araması için belirlenen zaman aralığı: ${timeType === 'd' ? 'Son 24 Saat' : timeType === 'w' ? 'Son 1 Hafta' : 'Son 1 Ay'}. Olayların kronolojik sırasına dikkat et ve bu tarihlere uygun bilgileri vurgula.)` : '';

  const finalPrompt = `
${prompts.search.instruction}
Kullanıcının Orijinal Sorusu: "${query}" ${timeContextMsg}

Arama Sonuçları:
${contextData.substring(0, 90000)}

GÖREV:
Yukarıdaki farklı kaynaklardan gelen bilgileri sentezleyerek kapsamlı bir cevap yaz.
${prompts.search.requirements.map(req => "- " + req).join("\n")}
Cevabında mutlaka kaynaklara (site isimlerine) atıf yap.
  `;

  // Zorunlu olarak step 3.5 flash modeli ile işliyoruz
  const targetModel = "stepfun/step-3.5-flash:free";
  console.log(`🧠 [FINAL SYNTHESIS] ${targetModel} modeli kullanılıyor...`);
  
  return await askAI(userId, targetModel, finalPrompt, undefined, onProgress);
}
