// src/services/html-sanitizer.ts

/**
 * Telegram'ın desteklemediği HTML etiketlerini temizler.
 */
export function sanitizeTelegramHTML(html: string): string {
  if (!html) return "";

  let clean = html;

  // 1. Blok Etiketleri Yeni Satıra Çevir (div, p, br)
  // \\n kullanıyorum ki string içinde kalsın.
  clean = clean.replace(/<\/?(div|p|section|article)[^>]*>/gi, '\n\n');
  clean = clean.replace(/<br\s*\/?>/gi, '\n');

  // 2. Başlıkları Kalın Yap (h1-h6 -> b)
  clean = clean.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n<b>$1</b>\n\n');

  // 3. Listeleri Düzelt (ul/ol -> new line, li -> bullet)
  clean = clean.replace(/<\/?(ul|ol)[^>]*>/gi, '\n');
  clean = clean.replace(/<li[^>]*>/gi, '\n• ');
  clean = clean.replace(/<\/li>/gi, '');

  // 4. Yasaklı Etiketleri Kaldır (img, script, style)
  clean = clean.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '');
  clean = clean.replace(/<img[^>]*>/gi, '');

  // 5. Gereksiz Boşlukları Temizle
  clean = clean.replace(/\n\s*\n/g, '\n\n');
  clean = clean.trim();

  return clean;
}
