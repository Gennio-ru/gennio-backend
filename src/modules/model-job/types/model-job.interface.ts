import { ISchema } from "src/common/base/base.interface";
import { ModelJobStatusType, ModelType } from "./model-job.enum";

export interface IModelJobBase {
  model: ModelType;
  status: ModelJobStatusType;
  prompt: string;
  userId: string;
  inputFileId: string | null;
  outputFileId: string | null;
  error: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
}

export interface IModelJob extends ISchema, IModelJobBase {}
