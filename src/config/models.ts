// src/config/models.ts

export interface AIModel {
  id: string;
  name: string;
  description: string;
  provider: string; 
}

export const availableModels: AIModel[] = [
  {
    id: "google/gemma-3-27b-it:free",
    name: "Gemma 3 (27B)",
    description: "Google'ın güncel modeli.",
    provider: "google"
  },
  {
    id: "meta-llama/llama-3.2-3b-instruct:free",
    name: "Llama 3.2 (3B)",
    description: "Hızlı ve hafif.",
    provider: "meta"
  },
  {
    id: "nousresearch/hermes-3-llama-3.1-405b:free",
    name: "Hermes 3 (405B)",
    description: "En güçlü mantık modeli.",
    provider: "nousresearch"
  },
  {
    id: "nvidia/nemotron-nano-12b-v2-vl:free",
    name: "Nemotron Nano (12B VL)",
    description: "Görsel ve metin yetenekli.",
    provider: "nvidia"
  },
  {
    id: "mistralai/mistral-small-3.1-24b-instruct:free",
    name: "Mistral Small 3.1",
    description: "Verimli ve zeki.",
    provider: "mistralai"
  },
  {
    id: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    name: "Dolphin Mistral (24B)",
    description: "Yaratıcı ve sansürsüz.",
    provider: "cognitivecomputations"
  },
  {
    id: "arcee-ai/trinity-large-preview:free",
    name: "Trinity Large",
    description: "Deneysel güçlü model.",
    provider: "arcee-ai"
  },
  {
    id: "stepfun/step-3.5-flash:free",
    name: "Step 3.5 Flash",
    description: "Anlık yanıt hızı.",
    provider: "stepfun"
  },
  {
    id: "z-ai/glm-4.5-air:free",
    name: "GLM 4.5 Air",
    description: "Genel amaçlı asistan.",
    provider: "z-ai"
  },
  {
    id: "openai/gpt-oss-120b:free",
    name: "GPT OSS (120B)",
    description: "Açık kaynaklı dev model.",
    provider: "openai"
  },
  {
    id: "mistralai/mistral-nemo:free", 
    name: "Mistral Nemo",
    description: "Küçük ama güçlü.",
    provider: "mistralai"
  }
];

// Gizli İşçi Model (Sadece kod içinde kullanılır)
export const workerModelId = "qwen/qwen-2.5-coder-32b-instruct:free";

// Varsayılan model: Gemma 3
export const defaultModelId = "google/gemma-3-27b-it:free";
