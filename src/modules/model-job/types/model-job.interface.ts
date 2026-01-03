import { ISchema } from "src/common/base/base.interface";
import {
  ModelJobStatusType,
  ModelJobTariffCode,
  ModelType,
} from "./model-job.enum";
import { ModelJobFile } from "../model-job-file.entity";

export interface IModelJobBase {
  model: ModelType;
  status: ModelJobStatusType;
  text: string | null;
  promptId: string | null;
  aspectRatio: string | null;
  imageSize: string | null;
  userId: string;
  files: ModelJobFile[] | null;
  outputText: string | null;
  tariffCode: ModelJobTariffCode;
  tokensCharged: number;
  usedTokens: Record<string, any> | null;
  error: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  resultsExpireAt: Date | null;
  resultsDeletedAt: Date | null;
}

export interface IModelJob extends ISchema, IModelJobBase {}
