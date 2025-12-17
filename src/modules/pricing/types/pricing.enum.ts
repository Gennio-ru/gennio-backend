export type ProviderAction = "edit" | "generate";
export type ProviderPriceLevel = "standard" | "high";

export type ProviderCostProfile = {
  generate: {
    standard: number;
    high: number;
  };
  edit: {
    standard: number;
    high: number;
  };
};
