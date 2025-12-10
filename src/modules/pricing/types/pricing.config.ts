import { ModelTariffCode } from "./pricing.enum";

export const PRICING: Record<ModelTariffCode, { tokens: number }> = {
  [ModelTariffCode.TextBasic]: { tokens: 1 },
  [ModelTariffCode.TextPro]: { tokens: 2 },

  [ModelTariffCode.ImageBasicGenerate]: { tokens: 10 },
  [ModelTariffCode.ImageBasicEdit]: { tokens: 10 },
  [ModelTariffCode.ImageProGenerate]: { tokens: 14 },
  [ModelTariffCode.ImageProEdit]: { tokens: 14 },
  [ModelTariffCode.AdminGenerate]: { tokens: 0 },
} as const;
