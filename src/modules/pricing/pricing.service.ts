import { Injectable } from "@nestjs/common";
import { IModelJobCreate } from "../model-job/types/model-job-mutations.interface";
import {
  PROVIDER_COST_OBJECT,
  PROVIDER_ACTION_OBJECT,
} from "./types/pricing.config";
import { ProviderPriceLevel } from "./types/pricing.enum";

@Injectable()
export class PricingService {
  getTokensForJob(payload: IModelJobCreate): number {
    if (!payload.model) {
      throw new Error("model is not set");
    }

    const modelCosts = PROVIDER_COST_OBJECT[payload.model];
    if (!modelCosts) {
      throw new Error(`Provider costs not found for model=${payload.model}`);
    }

    const providerAction = PROVIDER_ACTION_OBJECT[payload.type];
    if (!providerAction) {
      throw new Error(`Provider action not found for type=${payload.type}`);
    }

    const providerPriceLevel: ProviderPriceLevel =
      payload.imageSize === "4K" ? "high" : "standard";

    const tokens = modelCosts[providerAction]?.[providerPriceLevel];

    if (tokens === undefined || tokens === null) {
      throw new Error(
        `Provider price not found, model=${payload.model}, action=${providerAction}, level=${providerPriceLevel}`
      );
    }

    if (!Number.isFinite(tokens) || tokens < 0) {
      throw new Error(
        `Invalid provider price, model=${payload.model}, action=${providerAction}, level=${providerPriceLevel}, tokens=${tokens}`
      );
    }

    return tokens;
  }
}
