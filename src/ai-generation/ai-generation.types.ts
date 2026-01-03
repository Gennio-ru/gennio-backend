import {
  ModelJobType,
  ModelType,
} from "src/modules/model-job/types/model-job.enum";

export interface AiImageJobPayload {
  type: ModelJobType;
  promptText?: string;
  promptId?: string;
  // буфер исходного изображения (для edit)
  inputImageBase64?: string | string[] | null;
  aspectRatio?: string; // 1:1 || 2:3 ...
  imageSize?: string; // 1K || 2K ...
  provider: ModelType;
}

export type AiImageJobSuccessResult = {
  ok: true;
  imageBase64: string | string[];
  usedTokens: Record<string, any>;
  status?: number | null;
  requestId?: string | null;
  code?: null;
  error?: never;
};

export type AiImageJobErrorResult = {
  ok: false;
  error: string;
  status?: number | null;
  requestId?: string | null;
  code?: string | null;
  imageBase64?: undefined;
  usedTokens?: undefined;
};

export type AiImageJobResult = AiImageJobSuccessResult | AiImageJobErrorResult;
