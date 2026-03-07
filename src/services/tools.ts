// src/services/tools.ts
import axios from 'axios';
import { addMemory, searchMemories } from './database';

export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, string>;
}

export const toolDefinitions: ToolDefinition[] = [
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

export class ToolService {
    private static handlers: Record<string, (args: any) => Promise<any>> = {
        get_weather: async (args) => {
            const geo = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(args.city)}&count=1&language=tr&format=json`);
            if (!geo.data.results) return "Şehir bulunamadı.";
            const { latitude, longitude, name, country } = geo.data.results[0];
            const weather = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
            return `📍 ${name}, ${country}\n🌡️ Sıcaklık: ${weather.data.current_weather.temperature}°C`;
        },
        convert_currency: async (args) => {
            const res = await axios.get(`https://api.frankfurter.app/latest?amount=${args.amount}&from=${args.from.toUpperCase()}&to=${args.to.toUpperCase()}`);
            return `${args.amount} ${args.from} = ${res.data.rates[args.to.toUpperCase()]} ${args.to}`;
        },
        get_crypto_price: async (args) => {
            const crypto = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${args.coin.toLowerCase()}&vs_currencies=usd,try`);
            const cData = crypto.data[args.coin.toLowerCase()];
            return `🪙 ${args.coin.toUpperCase()}: $${cData.usd} / ₺${cData.try}`;
        },
        get_age_estimation: async (args) => {
            const ageRes = await axios.get(`https://api.agify.io/?name=${args.name}`);
            return `${args.name} için tahmini yaş: ${ageRes.data.age}`;
        },
        get_gender_estimation: async (args) => {
            const genRes = await axios.get(`https://api.genderize.io/?name=${args.name}`);
            return `${args.name} ismi %${genRes.data.probability * 100} ihtimalle ${genRes.data.gender === 'male' ? 'Erkek' : 'Kadın'}`;
        },
        get_universities: async (args) => {
            const uniRes = await axios.get(`http://universities.hipo.com/search?country=${encodeURIComponent(args.country)}`);
            return `${args.country} Üniversiteleri: ${uniRes.data.slice(0, 10).map((u: any) => u.name).join(', ')}`;
        },
        get_number_fact: async (args) => {
            const numRes = await axios.get(`http://numbersapi.com/${args.number}`);
            return numRes.data;
        },
        get_country_info: async (args) => {
            const countRes = await axios.get(`https://restcountries.com/v3.1/name/${encodeURIComponent(args.country_name)}`);
            const c = countRes.data[0];
            return `🌍 Ülke: ${c.name.common}, Başkent: ${c.capital?.[0]}, Nüfus: ${c.population}`;
        },
        get_space_x_launch: async () => {
            const res = await axios.get('https://api.spacexdata.com/v4/launches/latest');
            return `🚀 SpaceX Görevi: ${res.data.name}, Tarih: ${new Date(res.data.date_utc).toLocaleDateString('tr-TR')}, Detay: ${res.data.details || 'Bilgi yok.'}`;
        },
        get_quran_verse: async (args) => {
            const quranRes = await axios.get(`https://api.alquran.cloud/v1/ayah/${args.ayah_number}/tr.diyanet`);
            return `📖 Ayet: "${quranRes.data.data.text}" (${quranRes.data.data.surah.name})`;
        },
        get_ip_info: async (args) => {
            const ipRes = await axios.get(`http://ip-api.com/json/${args.ip}`);
            return `🌐 IP: ${args.ip}, Konum: ${ipRes.data.city}, ISP: ${ipRes.data.isp}`;
        },
        get_random_joke: async () => {
            const jokeRes = await axios.get('https://official-joke-api.appspot.com/random_joke');
            return `${jokeRes.data.setup} - ${jokeRes.data.punchline}`;
        },
        get_random_fact: async () => {
            const factRes = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en');
            return factRes.data.text;
        },
        get_random_activity: async () => {
            const actRes = await axios.get('https://www.boredapi.com/api/activity');
            return `💡 Öneri: ${actRes.data.activity}`;
        },
        get_random_advice: async () => {
            const advRes = await axios.get('https://api.adviceslip.com/advice');
            return `📝 Tavsiye: ${advRes.data.slip.advice}`;
        },
        get_pokemon_info: async (args) => {
            const pokeRes = await axios.get(`https://pokeapi.co/api/v2/pokemon/${args.pokemon_name.toLowerCase()}`);
            return `⚡ Pokemon: ${pokeRes.data.name.toUpperCase()}, Tip: ${pokeRes.data.types.map((t: any) => t.type.name).join(', ')}`;
        },
        get_random_emoji: async () => {
            const emoRes = await axios.get('https://emojihub.yurace.pro/api/random');
            return `Emoji: ${emoRes.data.name}`;
        },
        store_user_memory: async (args) => {
            await addMemory(args.userId, args.content, '', args.importance || 1);
            return "Bilgi kalıcı hafızaya başarıyla kaydedildi.";
        },
        search_user_memory: async (args) => {
            const memories = await searchMemories(args.userId, args.query);
            if (!memories || memories.length === 0) return "Bu konuda kayıtlı bir geçmiş bilgi bulunamadı.";
            return memories.map((m: any) => `- [${new Date(m.created_at).toLocaleDateString()}]: ${m.content}`).join('\n');
        },
        get_cat_fact: async () => {
            const catRes = await axios.get('https://meowfacts.herokuapp.com/');
            return `🐱 Kedi Bilgisi: ${catRes.data.data[0]}`;
        },
        get_dog_fact: async () => {
            const dogRes = await axios.get('https://dog-api.kinduff.com/api/facts');
            return `🐶 Köpek Bilgisi: ${dogRes.data.facts[0]}`;
        },
        get_sunrise_sunset: async (args) => {
            const sunRes = await axios.get(`https://api.sunrise-sunset.org/json?lat=${args.lat}&lng=${args.lng}&formatted=0`);
            return `🌅 Gün Doğumu: ${new Date(sunRes.data.results.sunrise).toLocaleTimeString('tr-TR')}, 🌇 Gün Batımı: ${new Date(sunRes.data.results.sunset).toLocaleTimeString('tr-TR')}`;
        },
        get_bible_verse: async (args) => {
            const bibRes = await axios.get(`https://bible-api.com/${encodeURIComponent(args.reference)}`);
            return `📖 İncil: "${bibRes.data.text}" (${bibRes.data.reference})`;
        },
        get_chuck_norris_joke: async () => {
            const chuckRes = await axios.get('https://api.chucknorris.io/jokes/random');
            return `🤠 Chuck Norris: ${chuckRes.data.value}`;
        }
    };

    static async execute(toolName: string, args: any) {
        console.log(`🛠️ Executing: ${toolName}`, args);
        try {
            const handler = this.handlers[toolName];
            if (handler) {
                return await handler(args);
            }
            return "Bu araç şu an kullanımda değil.";
        } catch (e: any) {
            console.error(`Error executing tool ${toolName}:`, e.message);
            return "İstek sırasında bir hata oluştu.";
        }
    }
}

