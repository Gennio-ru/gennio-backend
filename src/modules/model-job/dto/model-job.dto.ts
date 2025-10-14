import { ApiProperty, IntersectionType } from "@nestjs/swagger";
import { IModelJob, IModelJobBase } from "../types/model-job.interface";
import {
  ModelJobStatusType,
  ModelJobType,
  ModelType,
} from "../types/model-job.enum";
import { BaseDto } from "src/common/base/base.dto";

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
    example: "https://cdn.example.com/jobs/2025/09/19/5139b0d6-f38d-4af1.png",
    nullable: true,
  })
  inputFileUrl!: string | null;

  @ApiProperty({
    type: String,
    example: "https://cdn.example.com/jobs/2025/09/19/5139b0d6-f38d-4af1.png",
    nullable: true,
  })
  outputFileUrl!: string | null;

  @ApiProperty({
    type: String,
    example: "https://cdn.example.com/jobs/2025/09/19/5139b0d6-f38d-4af1.png",
    nullable: true,
  })
  outputPreviewFileUrl!: string | null;

  @ApiProperty({ example: "OpenAI timeout error", nullable: true })
  error!: string | null;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  startedAt!: Date | null;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  finishedAt!: Date | null;
}

export class ModelJobDto
  extends IntersectionType(ModelJobBaseDto, BaseDto)
  implements IModelJob {}
