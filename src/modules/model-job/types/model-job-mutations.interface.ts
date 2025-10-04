import { ModelType } from "./model-job.enum";

export interface IModelJobCreate {
  model: ModelType;
  prompt: string;
  inputFileId?: string;
  userId: string;
}
