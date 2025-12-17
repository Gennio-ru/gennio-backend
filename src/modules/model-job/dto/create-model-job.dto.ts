import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMinSize,
  IsArray,
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

  @ApiProperty({ type: [String], format: "uuid" })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("4", { each: true })
  inputFileIds!: string[];
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

  @ApiProperty({ type: [String], format: "uuid" })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("4", { each: true })
  inputFileIds!: string[];

  @ApiProperty({
    example: "2:3",
    description: "Формат",
  })
  @IsString()
  @IsOptional()
  aspectRatio?: string;

  @ApiProperty({
    example: "2K",
    description: "Разрешение",
  })
  @IsString()
  @IsOptional()
  imageSize?: string;
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

export class StartImageGenerateByStyleReferenceDto implements IModelJobStart {
  @ApiProperty({ type: [String], format: "uuid" })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("4", { each: true })
  inputFileIds!: string[];

  @ApiProperty({
    example: "2:3",
    description: "Формат",
  })
  @IsString()
  @IsOptional()
  aspectRatio?: string;

  @ApiProperty({
    example: "2K",
    description: "Разрешение",
  })
  @IsString()
  @IsOptional()
  imageSize?: string;
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

  @ApiProperty({
    example: "2K",
    description: "Разрешение",
  })
  @IsString()
  @IsOptional()
  imageSize?: string;

  @ApiProperty({ type: [String], format: "uuid" })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("4", { each: true })
  inputFileIds!: string[];

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
