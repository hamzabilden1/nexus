// src/bot/state.ts
export type PdfContentBlock = { type: 'text', content: string } | { type: 'image', content: string };

// In-memory oturum yönetimi (PDF Builder için)
export const documentBuilderSessions = new Map<number, PdfContentBlock[]>();

// Not Alma Oturumu (Kullanıcı ID -> Geçerli Not Başlığı ve İçerik)
export const noteSessions = new Map<number, { title: string, lines: string[] }>();

// Hatırlatıcı Oturumu (Durum Makinesi)
export type ReminderStep = 'AWAITING_TITLE' | 'AWAITING_TIME';
export const reminderSessions = new Map<number, { step: ReminderStep, title?: string }>();

