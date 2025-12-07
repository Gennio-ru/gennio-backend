import { ApiProperty } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { IModelJobStart } from "../types/model-job-mutations.interface";

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
}
