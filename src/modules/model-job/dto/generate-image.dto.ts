import { IsIn, IsOptional, IsString } from "class-validator";

export class GenerateImageDto {
  @IsString()
  prompt!: string;

  @IsOptional()
  @IsIn(["url", "b64_json"])
  responseFormat?: "url" | "b64_json";
}
