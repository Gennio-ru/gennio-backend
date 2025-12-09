import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import {
  IModelJobAdminStart,
  IModelJobStart,
} from "../types/model-job-mutations.interface";
import { ModelJobType, ModelType } from "../types/model-job.enum";
import { Transform } from "class-transformer";

export class StartImageEditByPromptIdDto implements IModelJobStart {
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

export class StartImageEditByPromptTextDto implements IModelJobStart {
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

  @ApiProperty({
    example: "2:3",
    description: "Формат",
  })
  @IsString()
  @IsOptional()
  aspectRatio?: string;
}

export class StartImageGenerateByPromptTextDto implements IModelJobStart {
  @ApiProperty({
    example: "Мягкое освещение, крупный план",
    maxLength: 700,
    description: "Не более 700 символов",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(700, { message: "Текст не должен превышать 700 символов" })
  text: string;

  @ApiProperty({
    example: "2:3",
    description: "Формат",
  })
  @IsString()
  @IsOptional()
  aspectRatio?: string;
}

export class StartAdminGenerateDto implements IModelJobAdminStart {
  @ApiProperty({
    example: "Мягкое освещение, крупный план",
    maxLength: 700,
    description: "Не более 700 символов",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(700, { message: "Текст не должен превышать 700 символов" })
  text: string;

  @ApiProperty({
    example: "2:3",
    description: "Формат",
  })
  @IsString()
  @IsOptional()
  aspectRatio?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  @Transform(({ value }) => (value === "" ? undefined : value))
  inputFileId?: string;

  @ApiProperty({
    enum: ModelType,
    enumName: "ModelType",
  })
  @IsEnum(ModelType)
  model: ModelType;

  @ApiProperty({
    enum: ModelJobType,
    enumName: "ModelJobType",
  })
  @IsEnum(ModelJobType)
  type: ModelJobType;
}
