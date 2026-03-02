// src/services/personas.ts
import personasData from '../config/personas.json';

export interface Persona {
  id: string;
  name: string;
  description: string;
  instructions: string;
}

// Dosyayı oku ve rolleri al
export function getPersonas(): Persona[] {
  return personasData as Persona[];
}

// ID'ye göre rol bul
export function getPersonaById(id: string): Persona | undefined {
  const personas = getPersonas();
  return personas.find(p => p.id === id);
}

// Varsayılan rol
export const DEFAULT_PERSONA_ID = 'default';
