// src/config/models.ts

export interface AIModel {
  id: string;
  name: string;
  description: string;
  provider: string; 
}

export const availableModels: AIModel[] = [
  {
    id: "stepfun/step-3.5-flash:free",
    name: "Step 3.5 Flash",
    description: "Hızlı ve verimli Stepfun modeli.",
    provider: "stepfun"
  },
  {
    id: "arcee-ai/trinity-large-preview:free",
    name: "Trinity Large Preview",
    description: "Arcee AI'nın güçlü ön izleme modeli.",
    provider: "arcee-ai"
  },
  {
    id: "z-ai/glm-4.5-air:free",
    name: "GLM 4.5 Air",
    description: "Z-AI'nın yüksek performanslı hafif modeli.",
    provider: "z-ai"
  }
];

// Varsayılan model: GLM 4.5 Air
export const defaultModelId = "z-ai/glm-4.5-air:free";

// Vision (Görsel) Modelleri - Rastgele seçilecek ücretsiz modeller
export const visionModels = [
  "qwen/qwen3-vl-30b-a3b-thinking",
  "qwen/qwen3-vl-235b-a22b-thinking",
  "nvidia/nemotron-nano-12b-v2-vl:free"
];

