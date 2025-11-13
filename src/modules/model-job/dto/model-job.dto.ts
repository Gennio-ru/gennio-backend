import { ApiProperty, IntersectionType } from "@nestjs/swagger";
import { IModelJob, IModelJobBase } from "../types/model-job.interface";
import {
  ModelJobStatusType,
  ModelJobType,
  ModelType,
} from "../types/model-job.enum";
import { BaseDto } from "src/common/base/base.dto";
import { ModelTariffCode } from "src/modules/pricing/types/pricing.enum";
import { User } from "src/modules/users/user.entity";
import { UserDto } from "src/modules/users/dto/user.dto";

export class ModelJobBaseDto implements IModelJobBase {
  @ApiProperty({ enum: ModelType, enumName: "ModelType" })
  model!: ModelType;

  @ApiProperty({ enum: ModelJobType, enumName: "ModelJobType" })
  type!: ModelJobType;

  @ApiProperty({ enum: ModelJobStatusType, enumName: "ModelJobStatusType" })
  status!: ModelJobStatusType;

  @ApiProperty({
    type: String,
    nullable: true,
    example: "Мягкое освещение, крупный план",
  })
  text: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: "Мягкое освещение, крупный план",
  })
  promptId: string | null;

  @ApiProperty({ example: "user-123" })
  userId!: string;

  @ApiProperty({ type: () => UserDto, nullable: true })
  user!: UserDto | null;

  @ApiProperty({
    type: String,
    format: "uuid",
    example: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    nullable: true,
  })
  inputFileId!: string | null;

  @ApiProperty({
    type: String,
    format: "uuid",
    example: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    nullable: true,
  })
  outputFileId!: string | null;

  @ApiProperty({
    type: String,
    format: "uuid",
    example: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    nullable: true,
  })
  outputPreviewFileId!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
  })
  outputText: string | null;

  @ApiProperty({
    enum: ModelTariffCode,
    enumName: "ModelTariffCode",
    description: "Тариф, по которому считали стоимость задачи",
  })
  tariffCode!: ModelTariffCode;

  @ApiProperty({
    type: Number,
    example: 8,
    description: "Сколько кредитов списано за эту задачу",
  })
  creditsCharged!: number;

  @ApiProperty({
    type: String,
    example: "OpenAI timeout error",
    nullable: true,
  })
  error!: string | null;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  startedAt!: Date | null;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  finishedAt!: Date | null;
}

export class ModelJobFullDto
  extends IntersectionType(ModelJobBaseDto, BaseDto)
  implements IModelJobBase
{
  @ApiProperty({
    type: String,
    example: "https://cdn.example.com/jobs/2025/09/19/5139b0d6-f38d-4af1.jpeg",
    nullable: true,
  })
  inputFileUrl!: string | null;

  @ApiProperty({
    type: String,
    example: "https://cdn.example.com/jobs/2025/09/19/5139b0d6-f38d-4af1.jpeg",
    nullable: true,
  })
  outputFileUrl!: string | null;

  @ApiProperty({
    type: String,
    example: "https://cdn.example.com/jobs/2025/09/19/5139b0d6-f38d-4af1.jpeg",
    nullable: true,
  })
  outputPreviewFileUrl!: string | null;
}

export class ModelJobDto
  extends IntersectionType(ModelJobBaseDto, BaseDto)
  implements IModelJob {}
