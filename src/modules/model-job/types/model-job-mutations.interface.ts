import { ModelJobTariffCode, ModelJobType, ModelType } from "./model-job.enum";

export interface IModelJobCreate {
  model: ModelType;
  type: ModelJobType;
  text?: string;
  promptId?: string;
  inputFileIds?: string[];
  userId: string;
  tariffCode?: ModelJobTariffCode;
  aspectRatio?: string;
  imageSize?: string;
}

export interface IModelJobStart {
  text?: string;
  promptId?: string;
  inputFileIds?: string[];
  aspectRatio?: string;
  imageSize?: string;
}

export interface IModelJobAdminStart {
  text?: string;
  promptId?: string;
  inputFileIds?: string[];
  aspectRatio?: string;
  imageSize?: string;
  model: ModelType;
  type: ModelJobType;
}
