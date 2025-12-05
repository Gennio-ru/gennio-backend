import { ISchema } from "src/common/base/base.interface";
import type { PromptType } from "src/modules/prompts/types/prompt-type.enum";

export interface IPromptBase {
  title: string;
  description: string;
  beforeImageId: string;
  beforePreviewImageId: string;
  afterImageId: string;
  afterPreviewImageId: string;
  type: PromptType;
  text: string;
  categoryId: string | null;
}

export interface IPrompt extends ISchema, IPromptBase {}
