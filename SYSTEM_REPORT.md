# CLAW - Akıllı Telegram Botu Sistem Raporu

## 1. Proje Özeti
CLAW, modern yapay zeka teknolojilerini (OpenAI/OpenRouter) kullanarak kullanıcılarına geniş bir yelpazede hizmet sunan, modüler mimariye sahip gelişmiş bir Telegram botudur. Bot; internet araması, web sayfası özetleme, hatırlatıcı yönetimi, not alma ve çeşitli araçlar (tools) üzerinden gerçek zamanlı bilgi sağlama yeteneklerine sahiptir.

## 2. Teknik Mimari
Uygulama, TypeScript dili ile geliştirilmiş olup aşağıdaki temel bileşenlerden oluşur:

### 2.1. Backend Katmanı
- **Dil:** TypeScript
- **Runtime:** Node.js
- **Bot Framework:** Telegraf (v4)
- **Web Server:** Express (Sağlık kontrolleri ve harici tetikleyiciler için)

### 2.2. Veri Yönetimi
- **Ana Veritabanı:** Supabase (PostgreSQL). Kullanıcı profilleri, mesaj geçmişi, hatırlatıcılar ve kullanıcı hafızası burada saklanır.
- **Hafıza Sistemi:** Kullanıcıya özel "kalıcı hafıza" (memories) ve "bilgi tabanı" (knowledge base) özellikleri ile kişiselleştirilmiş AI deneyimi sunulur.

### 2.3. AI ve Araçlar
- **Yapay Zeka:** OpenRouter üzerinden çeşitli modeller (GPT-4o, Claude 3, Step-3.5-Flash vb.) dinamik olarak kullanılır.
- **Key Rotation:** API anahtarlarının kilitlenmesini veya limit aşımını önlemek için otomatik anahtar döndürme sistemi mevcuttur.
- **Tool Calling:** Bot, doğal dil içerisinden araç kullanımını (hava durumu, döviz, SpaceX verileri vb.) tespit ederek otomatik çalıştırır.
- **Vision:** Görsel analizi desteği ile resim içeriklerini yorumlayabilir.

## 3. Temel Özellikler ve Servisler

### 3.1. Akıllı İnternet Araması (`search.ts`)
- Birden fazla kaynaktan (DuckDuckGo, Google News, SearX) eş zamanlı arama yapar.
- AI ile arama sorgusunu analiz ederek en doğru zaman aralığını ve terimleri belirler.
- Sonuçları sentezleyerek kullanıcıya kaynakçalı bir özet sunar.

### 3.2. Web Okuyucu (`web-reader.ts`)
- `@mozilla/readability` kütüphanesini kullanarak web sayfalarındaki gereksiz öğeleri temizler ve sadece ana içeriği okur.
- Uzun makaleleri AI yardımıyla özetler.

### 3.3. Not ve Belge Yönetimi
- Kullanıcılar sesli veya metin olarak not alabilir.
- Alınan notlar PDF veya DOCX formatına dönüştürülebilir.

### 3.4. Hatırlatıcı Servisi (`reminders.ts`)
- Doğal dildeki hatırlatıcı komutlarını (`chrono-node` ile) anlar.
- Zamanı geldiğinde kullanıcıya otomatik bildirim gönderir.

### 3.5. Araç Servisi (`tools.ts`)
- **Finans:** Döviz çevirme, kripto para fiyatları.
- **Bilgi:** Wikipedia, Sözlük, Ülke bilgileri.
- **Eğlence:** Rastgele şaka, ilginç bilgiler, kedi/köpek bilgileri.
- **Hafıza:** Kullanıcı tercihlerini kaydetme ve geri çağırma.

## 4. Dosya Yapısı (Refactored)
```text
src/
├── index.ts              # Uygulama giriş noktası ve sunucu kurulumu
├── bot/
│   ├── bot.ts            # Bot konfigürasyonu ve middleware yönetimi
│   ├── actions/          # UI buton aksiyonları
│   ├── commands/         # Bot komutları (start, search, etc.)
│   ├── handlers/         # Mesaj işleme mantığı
│   └── middleware/       # Kullanıcı yetkilendirme ve loglama
├── services/
│   ├── ai.ts             # AI model yönetimi ve API entegrasyonu
│   ├── database.ts       # Supabase veritabanı işlemleri
│   ├── search.ts         # İnternet arama motoru
│   ├── tools.ts          # Harici API araçları (Refactored)
│   ├── reminders.ts      # Hatırlatıcı zamanlama servisi
│   └── web-reader.ts     # Web içeriği çıkarma servisi
└── config/               # Model ve prompt yapılandırmaları
```

## 5. Güvenlik ve Dayanıklılık
- `.env` üzerinden yönetilen gizli değişkenler.
- Global hata yakalama (`bot.catch`) mekanizması ile kesintisiz çalışma.
- Supabase üzerinden güvenli veri depolama.
- Otomatik yeniden deneme (retry) mekanizması içeren AI istekleri.

---
*Bu rapor, sistemin mevcut durumunu ve yapılan refactoring çalışmalarını özetlemektedir.*
