import { ConfigService } from "@nestjs/config";
import { GoogleGenAI } from "@google/genai";

export function createGeminiClient(config: ConfigService) {
  const apiKey = config.get<string>("GEMINI_API_SECRET");

  const baseUrl = config.get<string>("GOOGLE_GEMINI_BASE_URL")?.trim();
  const proxyToken = config.get<string>("GEMINI_PROXY_TOKEN")?.trim();

  // Если baseUrl не задан — ходим напрямую (дефолтное поведение SDK)
  if (!baseUrl) {
    return new GoogleGenAI({ apiKey });
  }

  // Если baseUrl задан — ходим через прокси (+ опционально токен)
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      baseUrl,
      ...(proxyToken
        ? {
            headers: {
              "x-proxy-token": proxyToken,
            },
          }
        : {}),
    },
  });
}
