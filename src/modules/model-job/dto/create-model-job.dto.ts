import { ApiProperty } from "@nestjs/swagger";
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { IModelJobCreate } from "../types/model-job-mutations.interface";
import { ModelType } from "../types/model-job.enum";

export class StartProcessBaseDto
  implements Omit<IModelJobCreate, "userId" | "type">
{
  @ApiProperty({ enum: ModelType, enumName: "ModelType" })
  @IsEnum(ModelType)
  @IsNotEmpty()
  model!: ModelType;
}

export class StartImageEditByPromptIdDto
  extends StartProcessBaseDto
  implements Omit<IModelJobCreate, "userId" | "type">
{
  @ApiProperty()
  @IsUUID()
  promptId!: string;

  @ApiProperty({
    example: "Мягкое освещение, крупный план",
    maxLength: 500,
    description: "Не более 500 символов",
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(500, { message: "Текст не должен превышать 500 символов" })
  text?: string;

  @ApiProperty()
  @IsUUID()
  inputFileId!: string;
}

export class StartImageEditByPromptTextDto
  extends StartProcessBaseDto
  implements Omit<IModelJobCreate, "userId" | "type">
{
  @ApiProperty({
    example: "Мягкое освещение, крупный план",
    maxLength: 500,
    description: "Не более 500 символов",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500, { message: "Текст не должен превышать 500 символов" })
  text: string;

  @ApiProperty()
  @IsUUID()
  inputFileId!: string;
}

export class StartImageGenerateByPromptTextDto
  extends StartProcessBaseDto
  implements Omit<IModelJobCreate, "userId" | "type">
{
  @ApiProperty({
    example: "Мягкое освещение, крупный план",
    maxLength: 500,
    description: "Не более 500 символов",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500, { message: "Текст не должен превышать 500 символов" })
  text: string;
}

export class StartTextGenerateDto
  extends StartProcessBaseDto
  implements Omit<IModelJobCreate, "userId" | "type">
{
  @ApiProperty({
    example: "Сгенерируй текст новогоднего поздравления",
    maxLength: 500,
    description: "Не более 500 символов",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500, { message: "Текст не должен превышать 500 символов" })
  text: string;
}
