// src/services/ai.ts
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { getConversationHistory, saveMessage, getUser } from './database';
import { getPersonaById, DEFAULT_PERSONA_ID } from './personas';
import * as prompts from '../config/prompts.json';
import { sanitizeTelegramHTML } from './html-sanitizer';
import { saveAndLearn } from './learning';
import { visionModels } from '../config/models';
import { ToolService } from './tools';

dotenv.config();

const openRouterKeys = process.env.OPENROUTER_API_KEYS 
  ? process.env.OPENROUTER_API_KEYS.split(',').map(k => k.trim())
  : [];

function getRandomClient(excludeKey?: string) {
  let availableKeys = openRouterKeys;
  if (excludeKey) {
    availableKeys = openRouterKeys.filter(k => k !== excludeKey);
  }
  const randomKey = availableKeys.length > 0 ? availableKeys[Math.floor(Math.random() * availableKeys.length)] : '';
  return {
    key: randomKey,
    client: new OpenAI({
      apiKey: randomKey,
      baseURL: "https://openrouter.ai/api/v1",
      timeout: 60000 
    })
  };
}

function getCurrentTimePrompt(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  };

  const fakeDate = new Date(now);
  fakeDate.setFullYear(2026);
  const formattedDate = fakeDate.toLocaleString('tr-TR', options);

  return `${prompts.system.time_instruction}\nBugünün Tarihi ve Saati: ${formattedDate}`;
}

export async function askAI(userId: number, modelId: string, message: string, imageUrl?: string, onProgress?: (msg: string) => Promise<void>): Promise<string> {
  const timeoutPromise = new Promise<string>((_, reject) => {
    setTimeout(() => { reject(new Error('AI_TIMEOUT')); }, 120000); 
  });

  try {
    const user = await getUser(userId);
    const personaId = user?.current_persona_id || DEFAULT_PERSONA_ID;
    const persona = getPersonaById(personaId);
    
    // IMAGE ROUTING: Resim varsa rastgele bir vision modeli seç
    let activeModelId = modelId;
    if (imageUrl) {
        activeModelId = visionModels[Math.floor(Math.random() * visionModels.length)];
    }
    
    console.log(`\n=========================================`);
    console.log(`🤖 [AI ATTEMPT] Model: ${activeModelId} ${imageUrl ? '(Vision Mode)' : ''}`);
    console.log(`👤 [USER]: ${message}`);
    
    if (onProgress) await onProgress(`🧠 <b>${activeModelId.split('/').pop()}</b> modeli ile düşünülüyor...`);

    const baseInstructions = persona?.instructions || prompts.system.base;
    const timePrompt = getCurrentTimePrompt();
    const toolInstruction = prompts.system.tool_instruction;
    const finalSystemPrompt = `${baseInstructions}\n\n${timePrompt}\n\n${toolInstruction}`;

    await saveMessage(userId, 'user', message + (imageUrl ? " [Görsel Eklendi]" : ""), activeModelId);

    const rawHistory = await getConversationHistory(userId, 50) || [];
    let history = rawHistory
      .map(msg => ({
        role: msg.role as "user" | "assistant" | "system", 
        content: msg.content
      }))
      .filter(msg => msg.content && msg.content.trim() !== "");

    let messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (imageUrl) {
      const visionPrompt = prompts.vision.instruction + "\n" + prompts.vision.requirements.map(r => "- " + r).join("\n");
      messages = [
        { role: "system", content: `${finalSystemPrompt}\n\n${visionPrompt}` },
        {
          role: "user",
          content: [
            { type: "text", text: message || "Bu resimde ne görüyorsun?" },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ];
    } else {
      messages = [{ role: "system", content: finalSystemPrompt }, ...history];
    }

    let iteration = 0;
    const maxIterations = 3;

    while (iteration < maxIterations) {
      let response = "Cevap yok.";
      let success = false;
      let keyRetries = 0;
      let lastUsedKey = "";

      // Key Rotation Loop (Model bazında değil, anahtar bazında deneme yapar)
      while (!success && keyRetries < 3) {
        const { client: activeClient, key } = getRandomClient(lastUsedKey);
        lastUsedKey = key;
        
        try {
          const requestOptions: any = {
            model: activeModelId,
            messages: messages,
            temperature: 0.7,
          };
          
          // Qwen modelleri için OpenRouter provider parametresini Alibaba olarak sınırla
          if (activeModelId.includes('qwen')) {
            requestOptions.provider = { order: ["Alibaba"], allow_fallbacks: false };
          }

          console.log(`📡 [API REQUEST] Gönderiliyor (Deneme ${keyRetries + 1})...`);
          const completionPromise = activeClient.chat.completions.create(requestOptions);

          // @ts-ignore
          const completion = await Promise.race([completionPromise, timeoutPromise]);
          // @ts-ignore
          response = completion.choices[0].message.content || "Cevap yok.";
          success = true;
          console.log(`✅ [API RESPONSE] Başarılı.`);
        } catch (error: any) {
          keyRetries++;
          console.error(`⚠️ [API ERROR] (Deneme ${keyRetries}):`, error.status, error.message);
          
          if ([429, 502, 503, 408, 424].includes(error.status) || error.message === 'AI_TIMEOUT') {
            console.log("🔄 Retrying with a different API key...");
            continue;
          } else {
            throw error;
          }
        }
      }

      const toolCallMatch = response.match(/\[TOOL_CALL: (\w+)\((.*)\)\]/);
      if (toolCallMatch) {
        const toolName = toolCallMatch[1];
        let toolArgs;
        try { toolArgs = JSON.parse(toolCallMatch[2].trim()); } catch (e) { toolArgs = {}; }
        
        console.log(`🛠️ [TOOL DETECTED] İsim: ${toolName}, Argümanlar:`, toolArgs);
        if (onProgress) await onProgress(`🛠️ Araç kullanılıyor: <b>${toolName}</b>...`);
        
        const toolResult = await ToolService.execute(toolName, { ...toolArgs, userId });
        console.log(`📄 [TOOL RESULT] ${String(toolResult).substring(0, 100)}...`);
        
        messages.push({ role: "assistant", content: response });
        messages.push({ role: "user", content: `[TOOL_RESULT: ${toolResult}]` });
        iteration++;
        
        if (onProgress) await onProgress(`🔍 Araç sonucu inceleniyor...`);
        continue;
      }

      response = sanitizeTelegramHTML(response);
      console.log(`💬 [FINAL RESPONSE] ${response.substring(0, 150)}...`);
      console.log(`=========================================\n`);
      
      await saveMessage(userId, 'assistant', response, activeModelId);
      
      saveAndLearn({
        timestamp: new Date().toISOString(),
        userId: userId,
        model: activeModelId,
        userMessage: message,
        botResponse: response
      });
      
      return response;
    }
    return "İşlem sonuçlandırılamadı.";

  } catch (error: any) {
    console.error(`❌ [FATAL ERROR] (${modelId}):`, error.status, error.message || error);
    const status = error.status;
    if (error.message === 'AI_TIMEOUT' || status === 408) return prompts.error.timeout;
    if (status === 400) return prompts.error.bad_request;
    if (status === 401) return prompts.error.auth_failed;
    if (status === 402) return prompts.error.insufficient_credits;
    if (status === 403) return prompts.error.moderation_flagged;
    if (status === 429) return prompts.error.rate_limit;
    if (status === 502 || status === 503 || status === 404 || status === 424) return prompts.error.not_found;
    return `Hata (${status || '??'}): ${error.message || "Bilinmeyen bir sorun oluştu."}`;
  }
}

