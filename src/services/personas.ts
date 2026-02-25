// src/services/personas.ts
import * as fs from 'fs';
import * as path from 'path';

export interface Persona {
  id: string;
  name: string;
  description: string;
  instructions: string;
}

const PERSONAS_FILE = path.join(__dirname, '../config/personas.json');

// Dosyayı oku ve rolleri al
export function getPersonas(): Persona[] {
  try {
    const data = fs.readFileSync(PERSONAS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading personas file:", error);
    return [];
  }
}

// ID'ye göre rol bul
export function getPersonaById(id: string): Persona | undefined {
  const personas = getPersonas();
  return personas.find(p => p.id === id);
}

// Varsayılan rol
export const DEFAULT_PERSONA_ID = 'default';
