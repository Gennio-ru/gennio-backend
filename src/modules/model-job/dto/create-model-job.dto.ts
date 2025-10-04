import { ApiProperty } from "@nestjs/swagger";
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
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

  @ApiProperty({ example: "Мягкое освещение, крупный план" })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  text?: string;

  @ApiProperty()
  @IsUUID()
  inputFileId!: string;
}

export class StartImageEditByPromptTextDto
  extends StartProcessBaseDto
  implements Omit<IModelJobCreate, "userId" | "type">
{
  @ApiProperty({ example: "Мягкое освещение, крупный план" })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty()
  @IsUUID()
  inputFileId!: string;
}

export class StartImageGenerateByPromptTextDto
  extends StartProcessBaseDto
  implements Omit<IModelJobCreate, "userId" | "type">
{
  @ApiProperty({ example: "Мягкое освещение, крупный план" })
  @IsString()
  @IsNotEmpty()
  text: string;
}
