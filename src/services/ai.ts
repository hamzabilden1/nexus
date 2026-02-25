// src/services/ai.ts
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { getConversationHistory, saveMessage, getUser } from './database';
import { getPersonaById, DEFAULT_PERSONA_ID } from './personas';
import * as prompts from '../config/prompts.json';
import { sanitizeTelegramHTML } from './html-sanitizer';
import { saveAndLearn } from './learning'; // Öğrenme Modülü

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  timeout: 60000 
});

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

export async function askAI(userId: number, modelId: string, message: string, imageUrl?: string): Promise<string> {
  const timeoutPromise = new Promise<string>((_, reject) => {
    setTimeout(() => { reject(new Error('AI_TIMEOUT')); }, 60000);
  });

  try {
    const user = await getUser(userId);
    const personaId = user?.current_persona_id || DEFAULT_PERSONA_ID;
    const persona = getPersonaById(personaId);
    
    const baseInstructions = persona?.instructions || prompts.system.base;
    const timePrompt = getCurrentTimePrompt();
    const finalSystemPrompt = `${baseInstructions}\n\n${timePrompt}`;

    await saveMessage(userId, 'user', message + (imageUrl ? " [Görsel Eklendi]" : ""), modelId);

    const rawHistory = await getConversationHistory(userId, 10) || [];
    const history = rawHistory.map(msg => ({
      role: msg.role as "user" | "assistant" | "system", 
      content: msg.content
    }));

    let messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
    let activeModelId = modelId;

    if (imageUrl) {
      activeModelId = "nvidia/nemotron-nano-12b-v2-vl:free"; 
      const visionPrompt = prompts.vision.instruction + "\n" + prompts.vision.requirements.map(r => "- " + r).join("\n");
      const fullVisionPrompt = `${finalSystemPrompt}\n\n${visionPrompt}`;

      messages = [
        { role: "system", content: fullVisionPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: message || "Bu resimde ne görüyorsun?" },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ];
    } else {
      messages = [
        { role: "system", content: finalSystemPrompt },
        ...history
      ];
    }

    const completionPromise = client.chat.completions.create({
      model: activeModelId,
      messages: messages,
      temperature: 0.7,
    });

    // @ts-ignore
    const completion = await Promise.race([completionPromise, timeoutPromise]);
    // @ts-ignore
    let response = completion.choices[0].message.content || "Cevap yok.";
    
    response = sanitizeTelegramHTML(response);

    await saveMessage(userId, 'assistant', response, activeModelId);

    // --- ÖĞRENME MODÜLÜ ---
    // Konuşmayı JSON'a kaydet ve Git'e işle
    saveAndLearn({
      timestamp: new Date().toISOString(),
      userId: userId,
      model: activeModelId,
      userMessage: message,
      botResponse: response
    });
    // ---------------------
    
    return response;

  } catch (error: any) {
    console.error(`AI Error (${modelId}):`, error.message || error);

    if (error.message === 'AI_TIMEOUT') return prompts.error.timeout;
    if (error.status === 403) return prompts.error.limit_exceeded;
    if (error.status === 404) return prompts.error.not_found;
    if (error.status === 429) return prompts.error.rate_limit;

    return `Hata: ${error.message || "Bilinmeyen"}`;
  }
}
