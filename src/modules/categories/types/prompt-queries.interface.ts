import type { PromptType } from "src/modules/prompts/types/prompt-type.enum";

export interface IPromptQuery {
  title: string;
  description: string;
  beforeImageId: string;
  afterImageId: string;
  text: string;
  type: PromptType;
}
