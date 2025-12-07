import { ISchema } from "src/common/base/base.interface";
import { ModelType } from "src/modules/model-job/types/model-job.enum";
import type { PromptType } from "src/modules/prompts/types/prompt-type.enum";

export interface IPromptBase {
  title: string;
  description: string;
  beforeImageId: string;
  beforePreviewImageId: string;
  afterImageId: string;
  afterPreviewImageId: string;
  type: PromptType;
  model: ModelType;
  text: string;
  categoryId: string | null;
}

export interface IPrompt extends ISchema, IPromptBase {}
