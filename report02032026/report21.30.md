# 🚀 Nexus Prime (Claw) - Kapsamlı Sistem Analiz ve Durum Raporu
**Tarih:** 02 Mart 2026 - 21:30
**Durum:** 🟢 Stabil (Production-Ready)

Bu rapor, Telegram tabanlı akıllı yapay zeka asistanı olan "Nexus Prime"ın mevcut mimarisini, yeteneklerini, entegrasyonlarını ve sistem sağlığını detaylandırmak amacıyla hazırlanmıştır.

---

## 1. 🏗️ Sistem Mimarisi ve Kod Yapısı
Sistem, bakımı kolaylaştırmak ve genişletilebilirliği artırmak amacıyla "Separation of Concerns" (Sorumlulukların Ayrılması) prensibine göre modüler bir yapıya geçirilmiştir. Eski `index.ts` odaklı monolitik yapı bırakılmıştır.

- **`src/bot/` Klasörü:** Telegram botunun komutları (`commands`), buton etkileşimleri (`actions`), mesaj dinleyicileri (`handlers`), durum yönetimi (`state.ts`) ve ara yazılımları (`middleware`) burada yönetilir.
- **`src/services/` Klasörü:** Sistemin beynini oluşturan dış servisler buradadır. AI istekleri, veritabanı bağlantısı, web okuyucu, doküman ayrıştırıcı, dosya oluşturucu (PDF/Word), hatırlatıcı motoru ve özel araçlar (API'ler) birbirinden izole çalışır.
- **Tip Güvenliği:** Proje tamamen TypeScript ile yazılmış ve `npx tsc --noEmit` ile sıfır hata vererek kusursuz bir şekilde derlenmektedir.

---

## 2. 🧠 Yapay Zeka ve Bilişsel Yetenekler
- **Çoklu Model Desteği (LLM Routing):** Kullanıcılar `/profilim` üzerinden farklı modelleri (örn: Step 3.5 Flash, GLM 4.5 Air vb.) seçebilir. Sistem OpenRouter üzerinden çalışır ve çöken/cevap vermeyen API anahtarlarına veya sağlayıcılara karşı **otomatik anahtar rotasyonu** (Key Rotation) yapar.
- **Görsel Okuma (Vision Mode):** Kullanıcı bir resim gönderdiğinde sistem otomatik olarak metin modelinden çıkıp **qwen3-vl** veya **nemotron-vl** (Alibaba/Nvidia) gibi ücretsiz vizyon modellerine geçer, resmi yorumlar ve asıl modele döndürür.
- **Bağlam ve Persona:** Bot, kullanıcının seçtiği bir role (Persona) bürünebilir. Konuşmaların geçmişi veritabanında tutulur ve her yeni istekte son 50 mesaj bağlama dahil edilerek sohbetin bütünlüğü korunur.

---

## 3. 🌐 Web ve Arama Motoru Entegrasyonu
Eski ve kararsız olan arama altyapısı, doğrudan AI destekli ve geniş bağlamlı bir hale getirilmiştir.
- **AI Destekli Sorgu (Query) Analizi:** Arama yapılmadan önce kullanıcının cümlesi (örn: "Son 1 ayda X'te ne oldu?") AI tarafından ayrıştırılır ve "Zaman" ile "Anahtar Kelime" olarak bölünür.
- **Çoklu Kaynak:** Google News, DuckDuckGo ve SearX anonim motorlarından aynı anda paralel veri çeker (`Promise.allSettled`). Biri çökse bile sistem durmaz, diğerinin sonuçlarıyla yola devam eder.
- **Zaman Filtresi ve Kapasite:** Arama motorlarına doğrudan "Son 1 gün / Hafta / Ay" parametreleri gönderilir. 50-60 sonuç toplanıp 90.000 karakterlik (100k context limitine uygun) devasa bir prompt halinde modele yedirilir.

---

## 4. 🧰 Otonom Araç Kullanımı (Tool Calling)
AI, kullanıcının sorusuna göre 20'den fazla ücretsiz ve anlık (real-time) açık kaynaklı API'yi kendi başına tetikleyebilir.
- **Mevcut API'ler:** Hava durumu (Open-Meteo), Döviz çeviri (Frankfurter), Kripto fiyatları (CoinGecko), Yaş/Cinsiyet tahmini (Agify/Genderize), IP Konumu, SpaceX Görevleri, Din/İnanç veri tabanları (Bible/Quran), Rastgele Bilgiler, Üniversite Listeleri vb.
- **Gerçek Zamanlı Log:** Bu araçlar çalışırken Telegram üzerinden kullanıcıya anlık bildirim atılır (Örn: `"⏳ İstek işleniyor... -> 🛠️ Araç kullanılıyor: get_weather -> 🔍 Sonuç inceleniyor..."`). İşlem bitince bu geçici mesajlar silinir ve temiz bir yanıt kalır.

---

## 5. 💾 Hafıza, Hatırlatıcı ve Veritabanı (Supabase)
Sistem Supabase (PostgreSQL) üzerinden çalışır.
- **Tablo Sağlığı:** `users`, `messages`, `knowledge`, `memories` ve `processed_updates` tabloları aktiftir. Botun çifte mesaj atması/alması engellenmiştir.
- **Kolay Not Alma (`/notal`):** Kullanıcı tek komutla bir not oturumu başlatır. Arkasından attığı tüm mesajlar bu nota kaydedilir ve `/notkapat` ile tek bir dosya gibi veritabanına yazılır. Bu notlar `/profilim` üzerinden silinebilir veya listelenebilir.
- **Hatırlatıcılar (`/hatirlatici`):** İnteraktif (adım adım) sorularla kullanıcıdan başlık ve zaman alınır. Kronometrik doğrulama ile tarih parse edilir. Arka planda `setInterval` ile çalışan `checkReminders` döngüsü her dakikada bir veritabanını tarar ve zamanı gelen hatırlatıcıları Telegram'dan kullanıcıya mesaj atıp ardından siler.
- **Kalıcı RAG Hafızası:** Kullanıcının geçmiş bilgileri `memories` tablosuna kaydedilir ve semantic benzerlik aratılabilir (AI gerekirse bu aracı otonom kullanır).

---

## 6. 📄 Doküman Analizi ve Dosya Çıktısı (PDF/Word)
- **Belge Okuma:** Kullanıcı `.pdf, .docx, .xlsx, .txt` gönderdiğinde bot bunu sunucuya indirir, `pdf-parse`, `mammoth` vb. kütüphanelerle metni çıkarır, okur ve özetler. Sunucuda dosya şişmesini önlemek için işlem bittiğinde veya **hata verse dahi** `finally` bloğu ile geçici dosya silinir (Storage Leak engellendi).
- **Web Reader (URL Okuma):** `/ozetle <url>` komutu. Web sitelerinin "403 Forbidden - Bot algılandı" hatalarına karşı Axios istekleri gerçek bir Chrome tarayıcısı (`User-Agent`, vb.) gibi maskelendi. İçerik `mozilla/readability` ile reklam ve menülerden arındırılarak sadece asıl makale okunur.
- **Dosya Oluşturma:** Kullanıcı konuşmaları `pdf_baslat` komutuyla adım adım resim+metin olarak toplayıp finalde PDF çıktısı olarak alabilir veya son mesajı `/pdf`, `/docx` komutlarıyla indirebilir.

---

## 7. ⚠️ Güvenlik ve Kararlılık (Fixlenen Sorunlar)
Bugüne kadar yapılan analizler sonucu giderilen kritik pürüzler:
1. **API Keys Sızıntısı:** Kaynak kodda açıkça duran 11 adet OpenRouter anahtarı ve Supabase Secret Key'leri tamamen `.env` dosyasına gizlendi.
2. **DuckDuckGo Anomaly Hatası:** Fazla aramalarda scraper'ın çökmesi engellendi, pasif geçiş ile hata tolere edilebilir hale getirildi.
3. **Storage Leaks:** Ses, belge ve resim indirmelerinde işlem bitimi silinmeme sorunu `try/catch/finally` mimarisiyle %100 temizlendi.
4. **Çift Tetikleme (Double Update):** Telegram'dan gelen aynı id'li bildirimlerin `processed_updates` tablosuyla bloklanması aktif edildi.
5. **STT (Voice) Kaldırıldı:** İstenildiği üzere Wit.ai ses okuma modülü kod tabanından ve paket bağımlılıklarından (`fluent-ffmpeg`) kalıcı olarak silindi.

---

## ✅ Sonuç
Nexus Prime (Claw), şu anki konfigürasyonu, modüler kod yapısı, hatasız derlenmesi, tam kapsamlı hata yakalama (Error Handling) yapısı ve eklenen interaktif UX (Kullanıcı Deneyimi) butonlarıyla tamamen **Canlı Ortama (Production)** alınmaya ve ölçeklenmeye uygun, son derece yetenekli bir yapay zeka sistemidir. Çalışmayan veya aksayan hiçbir fonksiyona rastlanmamıştır.
