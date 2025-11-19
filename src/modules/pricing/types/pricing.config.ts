import { ModelTariffCode } from "./pricing.enum";

export const PRICING: Record<ModelTariffCode, { tokens: number }> = {
  [ModelTariffCode.TextBasic]: { tokens: 1 },
  [ModelTariffCode.TextPro]: { tokens: 2 },

  [ModelTariffCode.ImageBasicGenerate]: { tokens: 5 },
  [ModelTariffCode.ImageBasicEdit]: { tokens: 5 },
  [ModelTariffCode.ImageProGenerate]: { tokens: 15 },
  [ModelTariffCode.ImageProEdit]: { tokens: 15 },
} as const;
