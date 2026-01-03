import {
  ModelJobType,
  ModelType,
} from "src/modules/model-job/types/model-job.enum";
import { ProviderAction, ProviderCostProfile } from "./pricing.enum";

const GEMINI_COST: ProviderCostProfile = {
  generate: {
    standard: 20,
    high: 35,
  },
  edit: {
    standard: 20,
    high: 35,
  },
};

const OPENAI_COST: ProviderCostProfile = {
  generate: {
    standard: 10,
    high: 10,
  },
  edit: {
    standard: 10,
    high: 10,
  },
};

export const PROVIDER_COST_OBJECT: Record<ModelType, ProviderCostProfile> = {
  [ModelType.Gemini]: GEMINI_COST,
  [ModelType.OpenAI]: OPENAI_COST,
};

export const PROVIDER_ACTION_OBJECT: Record<ModelJobType, ProviderAction> = {
  [ModelJobType.ImageEditByPromptId]: "edit",
  [ModelJobType.ImageEditByPromptText]: "edit",
  [ModelJobType.ImageEditByStyleReference]: "edit",
  [ModelJobType.ImageGenerateByPromptText]: "generate",
};
