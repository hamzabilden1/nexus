// src/services/html-sanitizer.ts

export function sanitizeTelegramHTML(html: string): string {
  if (!html) return "";

  let clean = html;

  // 1. Blok Etiketleri
  clean = clean.replace(/<\/?(div|p|section|article|header|footer)[^>]*>/gi, '\n\n');
  clean = clean.replace(/<br\s*\/?>/gi, '\n');

  // 2. Başlıklar
  clean = clean.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n<b>$1</b>\n\n');

  // 3. Listeler
  clean = clean.replace(/<\/?(ul|ol)[^>]*>/gi, '\n');
  clean = clean.replace(/<li[^>]*>/gi, '\n• ');
  clean = clean.replace(/<\/li>/gi, '');

  // 4. Yasaklıları Sil (Script, Style, Img, Table)
  clean = clean.replace(/<(script|style|table|iframe)[^>]*>[\s\S]*?<\/\1>/gi, '');
  clean = clean.replace(/<img[^>]*>/gi, '');

  // 5. Desteklenmeyen tüm etiketleri temizle (Sadece b, i, a, code kalsın)
  // Bu regex, izin verilenler dışındaki tüm <...> etiketlerini siler.
  clean = clean.replace(/<(?!(\/?(b|strong|i|em|u|ins|s|strike|del|a|code|pre)\b))[^>]+>/gi, '');

  // 6. Boşlukları Temizle
  clean = clean.replace(/\n\s*\n/g, '\n\n');
  clean = clean.trim();

  return clean;
}
