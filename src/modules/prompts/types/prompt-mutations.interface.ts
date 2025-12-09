import { ModelType } from "src/modules/model-job/types/model-job.enum";
import type { PromptType } from "src/modules/prompts/types/prompt-type.enum";

export interface IPromptCreate {
  title: string;
  description: string;
  beforeImageId: string;
  afterImageId: string;
  text: string;
  type: PromptType;
  model: ModelType;
  categoryId?: string;
}

export interface IPromptUpdate extends Partial<Omit<IPromptCreate, "type">> {}
