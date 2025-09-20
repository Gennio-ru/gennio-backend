import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsString, IsUUID } from "class-validator";
import { IModelJobCreate } from "../types/model-job-mutations.interface";
import { ModelType } from "../types/model-job.enum";

export class CreateModelJobDto implements Omit<IModelJobCreate, "userId"> {
  @ApiProperty({ enum: ModelType, enumName: "ModelType" })
  @IsEnum(ModelType)
  @IsNotEmpty()
  model!: ModelType;

  @ApiProperty({ example: "Мягкое освещение, крупный план" })
  @IsString()
  prompt!: string;

  @ApiProperty({
    format: "uuid",
    example: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  })
  @IsUUID()
  inputFileId!: string;
}
