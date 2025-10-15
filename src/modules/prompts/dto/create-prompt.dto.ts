import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { IPromptCreate } from "../types/prompt-mutations.interface";

export class CreatePromptDto
  implements Omit<IPromptCreate, "type" | "beforeImageId">
{
  @ApiProperty({ example: "Аниме-портрет" })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: "Мягкое освещение, крупный план" })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: "f47ac10b-58cc-4372-a567-0e02b2c3d479" })
  @IsUUID()
  @IsString()
  afterImageId!: string;

  @ApiProperty({ description: "Промпт шаблона" })
  @IsString()
  text: string;

  @ApiProperty({ description: "Категория" })
  @IsUUID()
  @IsOptional()
  categoryId?: string;
}
