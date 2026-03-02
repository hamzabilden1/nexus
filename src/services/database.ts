// src/services/database.ts
import { createClient } from '@supabase/supabase-js';
import { defaultModelId } from '../config/models';
import { DEFAULT_PERSONA_ID } from './personas';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseKey);

export async function initDatabase() {
  console.log('Supabase JS Client initialized. Ensure tables exist in Dashboard.');
  // Not: Supabase JS SDK ile tablo oluşturma (CREATE TABLE) genellikle Dashboard üzerinden yapılır.
  // Tabloların hazır olduğunu varsayıyoruz.
}

// --- User Functions ---
export async function getUser(telegramId: number) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();
  
  if (error && error.code !== 'PGRST116') console.error('GetUser Error:', error.message);
  return data;
}

export async function createUser(telegramId: number, username: string = '') {
  // Sadece yeni kullanıcılar için varsayılan model ve personayı veritabanına ekle
  const { error } = await supabase
    .from('users')
    .upsert({ 
        telegram_id: telegramId, 
        username,
        current_model_id: defaultModelId,
        current_persona_id: DEFAULT_PERSONA_ID
    }, { onConflict: 'telegram_id', ignoreDuplicates: true });
  
  if (error) console.error('CreateUser Error:', error.message);
}

export async function updateUserModel(telegramId: number, modelId: string) {
  await supabase
    .from('users')
    .update({ current_model_id: modelId })
    .eq('telegram_id', telegramId);
}

export async function updateUserPersona(telegramId: number, personaId: string) {
  await supabase
    .from('users')
    .update({ current_persona_id: personaId })
    .eq('telegram_id', telegramId);
}

// --- Message Functions ---
export async function saveMessage(telegramId: number, role: 'user' | 'assistant', content: string, modelId: string) {
  await supabase
    .from('messages')
    .insert({ telegram_id: telegramId, role, content, model_id: modelId });
}

export async function getConversationHistory(telegramId: number, limit: number = 50) {
  const { data, error } = await supabase
    .from('messages')
    .select('role, content')
    .eq('telegram_id', telegramId)
    .order('timestamp', { ascending: false })
    .limit(limit);
  
  return (data || []).reverse();
}

export async function getLastAssistantMessage(telegramId: number): Promise<string | null> {
  const { data, error } = await supabase
    .from('messages')
    .select('content')
    .eq('telegram_id', telegramId)
    .eq('role', 'assistant')
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();
  
  return data?.content || null;
}

// --- Knowledge Base Functions ---
export async function addKnowledge(telegramId: number, key: string, value: string) {
  await supabase
    .from('knowledge')
    .upsert({ telegram_id: telegramId, key: key.toLowerCase(), value }, { onConflict: 'telegram_id,key' });
}

export async function getKnowledge(telegramId: number, key: string) {
  const { data } = await supabase
    .from('knowledge')
    .select('value')
    .eq('telegram_id', telegramId)
    .eq('key', key.toLowerCase())
    .single();
  return data;
}

export async function listKnowledge(telegramId: number) {
  const { data } = await supabase
    .from('knowledge')
    .select('key')
    .eq('telegram_id', telegramId)
    .order('key', { ascending: true });
  return data || [];
}

export async function deleteKnowledge(telegramId: number, key: string) {
  await supabase
    .from('knowledge')
    .delete()
    .eq('telegram_id', telegramId)
    .eq('key', key.toLowerCase());
}

// --- Memory Functions ---
export async function addMemory(telegramId: number, content: string, tags: string = '', importance: number = 1) {
  await supabase
    .from('memories')
    .insert({ telegram_id: telegramId, content, tags, importance });
}

export async function searchMemories(telegramId: number, query: string, limit: number = 5) {
  // Supabase'de metin araması için ILIKE kullanılır
  const { data } = await supabase
    .from('memories')
    .select('content, tags, created_at')
    .eq('telegram_id', telegramId)
    .or(`content.ilike.%${query}%,tags.ilike.%${query}%`)
    .order('importance', { ascending: false })
    .limit(limit);
  
  return data || [];
}

export async function getAllMemories(telegramId: number) {
  const { data } = await supabase
    .from('memories')
    .select('content')
    .eq('telegram_id', telegramId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function deleteUserCompletely(telegramId: number) {
  // İlişkili tüm verileri sil
  await supabase.from('messages').delete().eq('telegram_id', telegramId);
  await supabase.from('knowledge').delete().eq('telegram_id', telegramId);
  await supabase.from('memories').delete().eq('telegram_id', telegramId);
  await supabase.from('users').delete().eq('telegram_id', telegramId);
}

export async function isUpdateProcessed(updateId: number): Promise<boolean> {
  const { data } = await supabase
    .from('processed_updates')
    .select('update_id')
    .eq('update_id', updateId)
    .single();
  return !!data;
}

export async function markUpdateAsProcessed(updateId: number) {
  await supabase.from('processed_updates').insert({ update_id: updateId });
}

// --- Reminder Functions (Using knowledge table) ---
export async function addReminder(telegramId: number, title: string, timestamp: number) {
  const key = `reminder:${timestamp}:${Date.now()}`;
  await addKnowledge(telegramId, key, title);
}

export async function getDueReminders(currentTime: number) {
  const { data } = await supabase
    .from('knowledge')
    .select('telegram_id, key, value')
    .ilike('key', 'reminder:%');
    
  if (!data) return [];
  
  const due = data.filter(r => {
    const parts = r.key.split(':');
    if (parts.length >= 2) {
      const time = parseInt(parts[1], 10);
      return time <= currentTime;
    }
    return false;
  });
  
  return due;
}
