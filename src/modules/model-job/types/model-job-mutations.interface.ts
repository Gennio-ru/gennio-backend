import { ModelTariffCode } from "src/modules/pricing/types/pricing.enum";
import { ModelJobType, ModelType } from "./model-job.enum";

export interface IModelJobCreate {
  model?: ModelType;
  type: ModelJobType;
  text?: string;
  promptId?: string;
  inputFileId?: string;
  userId: string;
  tariffCode: ModelTariffCode;
}

export interface IModelJobStart {
  text?: string;
  promptId?: string;
  inputFileId?: string;
}
