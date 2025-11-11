import { Injectable } from "@nestjs/common";
import { IModelJobCreate } from "../model-job/types/model-job-mutations.interface";
import { PRICING } from "./types/pricing.config";

@Injectable()
export class PricingService {
  getCreditsForJob(payload: IModelJobCreate): number {
    const pricing = PRICING[payload.tariffCode];
    if (!pricing) {
      throw new Error(`Unknown tariffCode: ${payload.tariffCode}`);
    }
    return pricing.credits;
  }
}
