// src/services/tools.ts
import axios from 'axios';

export const toolDefinitions = [
    { name: "get_weather", description: "Bir şehrin güncel hava durumunu getirir.", parameters: { city: "string" } },
    { name: "convert_currency", description: "İki para birimi arasında dönüşüm yapar.", parameters: { amount: "number", from: "string", to: "string" } },
    { name: "get_crypto_price", description: "Kripto paraların güncel fiyatını getirir.", parameters: { coin: "string" } },
    { name: "get_ip_info", description: "Bir IP adresinin coğrafi konum bilgisini getirir.", parameters: { ip: "string" } },
    { name: "get_holidays", description: "Bir ülkenin resmi tatillerini getirir.", parameters: { country_code: "string", year: "number" } },
    { name: "get_random_joke", description: "Rastgele fıkra anlatır.", parameters: {} },
    { name: "get_random_fact", description: "Rastgele ilginç bir bilgi verir.", parameters: {} },
    { name: "get_dictionary_definition", description: "Bir kelimenin sözlük anlamını getirir.", parameters: { word: "string" } },
    { name: "get_age_estimation", description: "Bir isimden yaş tahmini yapar.", parameters: { name: "string" } },
    { name: "get_gender_estimation", description: "Bir isimden cinsiyet tahmini yapar.", parameters: { name: "string" } },
    { name: "get_nationality_estimation", description: "Bir isimden milliyet tahmini yapar.", parameters: { name: "string" } },
    { name: "get_random_activity", description: "Canı sıkılanlar için aktivite önerir.", parameters: {} },
    { name: "get_cat_fact", description: "Kediler hakkında ilginç bir bilgi verir.", parameters: {} },
    { name: "get_dog_fact", description: "Köpekler hakkında ilginç bir bilgi verir.", parameters: {} },
    { name: "get_number_fact", description: "Bir sayı hakkında ilginç bilgi verir.", parameters: { number: "number" } },
    { name: "get_universities", description: "Bir ülkedeki üniversiteleri listeler.", parameters: { country: "string" } },
    { name: "get_sunrise_sunset", description: "Koordinatlara göre gün doğumu ve batımı saati verir.", parameters: { lat: "number", lng: "number" } },
    { name: "get_chuck_norris_joke", description: "Chuck Norris şakası anlatır.", parameters: {} },
    { name: "get_random_advice", description: "Rastgele hayat tavsiyesi verir.", parameters: {} },
    { name: "get_country_info", description: "Bir ülke hakkında detaylı bilgi getirir.", parameters: { country_name: "string" } },
    { name: "get_pokemon_info", description: "Bir Pokemon hakkında bilgi getirir.", parameters: { pokemon_name: "string" } },
    { name: "get_space_x_launch", description: "SpaceX'in son fırlatma bilgilerini getirir.", parameters: {} },
    { name: "get_bible_verse", description: "İncil'den ayet getirir.", parameters: { reference: "string" } },
    { name: "get_quran_verse", description: "Kuran'dan ayet getirir.", parameters: { ayah_number: "number" } },
    { name: "get_random_emoji", description: "Rastgele bir emoji ve anlamını getirir.", parameters: {} },
    { name: "store_user_memory", description: "Kullanıcı hakkında önemli bir bilgiyi kalıcı hafızaya kaydeder.", parameters: { content: "string", importance: "number" } },
    { name: "search_user_memory", description: "Kullanıcının geçmişi veya tercihleri hakkında hafızada arama yapar.", parameters: { query: "string" } }
];

import { addMemory, searchMemories } from './database';

export class ToolService {
    // ... Existing methods ...
    static async getWeather(city: string) {
        try {
            const geo = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=tr&format=json`);
            if (!geo.data.results) return "Şehir bulunamadı.";
            const { latitude, longitude, name, country } = geo.data.results[0];
            const weather = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
            return `📍 ${name}, ${country}\n🌡️ Sıcaklık: ${weather.data.current_weather.temperature}°C`;
        } catch (e) { return "Hava durumu alınamadı."; }
    }

    static async convertCurrency(amount: number, from: string, to: string) {
        try {
            const res = await axios.get(`https://api.frankfurter.app/latest?amount=${amount}&from=${from.toUpperCase()}&to=${to.toUpperCase()}`);
            return `${amount} ${from} = ${res.data.rates[to.toUpperCase()]} ${to}`;
        } catch (e) { return "Döviz çevrilemedi."; }
    }

    static async getSpaceXLaunch() {
        try {
            const res = await axios.get('https://api.spacexdata.com/v4/launches/latest');
            return `🚀 SpaceX Görevi: ${res.data.name}, Tarih: ${new Date(res.data.date_utc).toLocaleDateString('tr-TR')}, Detay: ${res.data.details || 'Bilgi yok.'}`;
        } catch (e) { return "SpaceX bilgisi alınamadı."; }
    }

    static async execute(toolName: string, args: any) {
        console.log(`🛠️ Executing: ${toolName}`, args);
        try {
            switch (toolName) {
                case "get_weather": return await this.getWeather(args.city);
                case "convert_currency": return await this.convertCurrency(args.amount, args.from, args.to);
                case "get_crypto_price": 
                    const crypto = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${args.coin.toLowerCase()}&vs_currencies=usd,try`);
                    const cData = crypto.data[args.coin.toLowerCase()];
                    return `🪙 ${args.coin.toUpperCase()}: $${cData.usd} / ₺${cData.try}`;
                case "get_age_estimation": 
                    const ageRes = await axios.get(`https://api.agify.io/?name=${args.name}`);
                    return `${args.name} için tahmini yaş: ${ageRes.data.age}`;
                case "get_gender_estimation":
                    const genRes = await axios.get(`https://api.genderize.io/?name=${args.name}`);
                    return `${args.name} ismi %${genRes.data.probability * 100} ihtimalle ${genRes.data.gender === 'male' ? 'Erkek' : 'Kadın'}`;
                case "get_universities":
                    const uniRes = await axios.get(`http://universities.hipo.com/search?country=${encodeURIComponent(args.country)}`);
                    return `${args.country} Üniversiteleri: ${uniRes.data.slice(0, 10).map((u: any) => u.name).join(', ')}`;
                case "get_number_fact":
                    const numRes = await axios.get(`http://numbersapi.com/${args.number}`);
                    return numRes.data;
                case "get_country_info":
                    const countRes = await axios.get(`https://restcountries.com/v3.1/name/${encodeURIComponent(args.country_name)}`);
                    const c = countRes.data[0];
                    return `🌍 Ülke: ${c.name.common}, Başkent: ${c.capital?.[0]}, Nüfus: ${c.population}`;
                case "get_space_x_launch":
                    return await this.getSpaceXLaunch();
                case "get_quran_verse":
                    const quranRes = await axios.get(`https://api.alquran.cloud/v1/ayah/${args.ayah_number}/tr.diyanet`);
                    return `📖 Ayet: "${quranRes.data.data.text}" (${quranRes.data.data.surah.name})`;
                case "get_ip_info": 
                    const ipRes = await axios.get(`http://ip-api.com/json/${args.ip}`);
                    return `🌐 IP: ${args.ip}, Konum: ${ipRes.data.city}, ISP: ${ipRes.data.isp}`;
                case "get_random_joke":
                    const jokeRes = await axios.get('https://official-joke-api.appspot.com/random_joke');
                    return `${jokeRes.data.setup} - ${jokeRes.data.punchline}`;
                case "get_random_fact":
                    const factRes = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en');
                    return factRes.data.text;
                case "get_random_activity":
                    const actRes = await axios.get('https://www.boredapi.com/api/activity');
                    return `💡 Öneri: ${actRes.data.activity}`;
                case "get_random_advice":
                    const advRes = await axios.get('https://api.adviceslip.com/advice');
                    return `📝 Tavsiye: ${advRes.data.slip.advice}`;
                case "get_pokemon_info":
                    const pokeRes = await axios.get(`https://pokeapi.co/api/v2/pokemon/${args.pokemon_name.toLowerCase()}`);
                    return `⚡ Pokemon: ${pokeRes.data.name.toUpperCase()}, Tip: ${pokeRes.data.types.map((t:any) => t.type.name).join(', ')}`;
                case "get_random_emoji":
                    const emoRes = await axios.get('https://emojihub.yurace.pro/api/random');
                    return `Emoji: ${emoRes.data.name}`;
                case "store_user_memory":
                    await addMemory(args.userId, args.content, '', args.importance || 1);
                    return "Bilgi kalıcı hafızaya başarıyla kaydedildi.";
                case "search_user_memory":
                    const memories = await searchMemories(args.userId, args.query);
                    if (!memories || memories.length === 0) return "Bu konuda kayıtlı bir geçmiş bilgi bulunamadı.";
                    return memories.map((m: any) => `- [${new Date(m.created_at).toLocaleDateString()}]: ${m.content}`).join('\n');
                case "get_cat_fact":
                    const catRes = await axios.get('https://meowfacts.herokuapp.com/');
                    return `🐱 Kedi Bilgisi: ${catRes.data.data[0]}`;
                case "get_dog_fact":
                    const dogRes = await axios.get('https://dog-api.kinduff.com/api/facts');
                    return `🐶 Köpek Bilgisi: ${dogRes.data.facts[0]}`;
                case "get_sunrise_sunset":
                    const sunRes = await axios.get(`https://api.sunrise-sunset.org/json?lat=${args.lat}&lng=${args.lng}&formatted=0`);
                    return `🌅 Gün Doğumu: ${new Date(sunRes.data.results.sunrise).toLocaleTimeString('tr-TR')}, 🌇 Gün Batımı: ${new Date(sunRes.data.results.sunset).toLocaleTimeString('tr-TR')}`;
                case "get_bible_verse":
                    const bibRes = await axios.get(`https://bible-api.com/${encodeURIComponent(args.reference)}`);
                    return `📖 İncil: "${bibRes.data.text}" (${bibRes.data.reference})`;
                case "get_chuck_norris_joke":
                    const chuckRes = await axios.get('https://api.chucknorris.io/jokes/random');
                    return `🤠 Chuck Norris: ${chuckRes.data.value}`;
                default: return "Bu araç şu an kullanımda değil.";
            }
        } catch (e) { return "İstek sırasında bir hata oluştu."; }
    }
}
