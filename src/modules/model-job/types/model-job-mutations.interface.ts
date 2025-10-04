import { ModelJobType, ModelType } from "./model-job.enum";

export interface IModelJobCreate {
  model: ModelType;
  type: ModelJobType;
  text?: string;
  promptId?: string;
  inputFileId?: string;
  userId: string;
}
