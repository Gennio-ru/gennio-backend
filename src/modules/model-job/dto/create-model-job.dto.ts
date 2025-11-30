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
  implements Omit<IModelJobCreate, "userId" | "type" | "tariffCode">
{
  @ApiProperty({ enum: ModelType, enumName: "ModelType" })
  @IsEnum(ModelType)
  @IsNotEmpty()
  model!: ModelType;
}

export class StartImageEditByPromptIdDto
  extends StartProcessBaseDto
  implements Omit<IModelJobCreate, "userId" | "type" | "tariffCode">
{
  @ApiProperty()
  @IsUUID()
  promptId!: string;

  @ApiProperty({
    example: "Мягкое освещение, крупный план",
    maxLength: 300,
    description: "Не более 300 символов",
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(300, { message: "Текст не должен превышать 300 символов" })
  text?: string;

  @ApiProperty()
  @IsUUID()
  inputFileId!: string;
}

export class StartImageEditByPromptTextDto
  extends StartProcessBaseDto
  implements Omit<IModelJobCreate, "userId" | "type" | "tariffCode">
{
  @ApiProperty({
    example: "Мягкое освещение, крупный план",
    maxLength: 700,
    description: "Не более 700 символов",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(700, { message: "Текст не должен превышать 700 символов" })
  text: string;

  @ApiProperty()
  @IsUUID()
  inputFileId!: string;
}

export class StartImageGenerateByPromptTextDto
  extends StartProcessBaseDto
  implements Omit<IModelJobCreate, "userId" | "type" | "tariffCode">
{
  @ApiProperty({
    example: "Мягкое освещение, крупный план",
    maxLength: 700,
    description: "Не более 700 символов",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(700, { message: "Текст не должен превышать 700 символов" })
  text: string;
}
