import { ModelTariffCode } from "./pricing.enum";

export const PRICING: Record<ModelTariffCode, { credits: number }> = {
  [ModelTariffCode.TextBasic]: { credits: 1 },
  [ModelTariffCode.TextPro]: { credits: 2 },

  [ModelTariffCode.ImageBasicGenerate]: { credits: 5 },
  [ModelTariffCode.ImageBasicEdit]: { credits: 5 },
  [ModelTariffCode.ImageProGenerate]: { credits: 15 },
  [ModelTariffCode.ImageProEdit]: { credits: 15 },
} as const;
