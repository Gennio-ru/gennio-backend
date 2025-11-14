import { ISchema } from "src/common/base/base.interface";
import { ModelJobStatusType, ModelType } from "./model-job.enum";
import { ModelTariffCode } from "src/modules/pricing/types/pricing.enum";

export interface IModelJobBase {
  model: ModelType;
  status: ModelJobStatusType;
  text: string | null;
  promptId: string | null;
  userId: string;
  inputFileId: string | null;
  outputFileId: string | null;
  outputPreviewFileId: string | null;
  outputText: string | null;
  tariffCode: ModelTariffCode;
  creditsCharged: number;
  usedTokens: Record<string, any> | null;
  error: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
}

export interface IModelJob extends ISchema, IModelJobBase {}
