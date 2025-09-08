import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { IPromptCreate } from "../types/prompt-mutations.interface";

export class CreatePromptDto implements Omit<IPromptCreate, "type"> {
  @ApiProperty({ example: "Аниме-портрет" })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ example: "Мягкое освещение, крупный план" })
  @IsOptional()
  @IsString()
  description!: string;

  @ApiPropertyOptional({ example: "/uploads/previews/anime-portrait.jpg" })
  @IsOptional()
  @IsString()
  beforeImageId!: string;

  @ApiPropertyOptional({ example: "/uploads/previews/anime-portrait.jpg" })
  @IsOptional()
  @IsString()
  afterImageId!: string;

  @ApiProperty({
    type: String,
    description: "промпт шаблона",
  })
  @IsString()
  text: string;
}
