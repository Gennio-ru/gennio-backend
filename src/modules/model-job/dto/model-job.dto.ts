import { ApiProperty, IntersectionType } from "@nestjs/swagger";
import { IModelJob, IModelJobBase } from "../types/model-job.interface";
import {
  ModelJobStatusType,
  ModelJobType,
  ModelType,
} from "../types/model-job.enum";
import { BaseDto } from "src/common/base/base.dto";
import { ModelTariffCode } from "src/modules/pricing/types/pricing.enum";
import { UserDto } from "src/modules/users/dto/user.dto";
import { FileDto } from "src/modules/files/dto/file.dto";
import { Expose, Transform, Type } from "class-transformer";
import { UserRole } from "src/modules/users/types/user-role.enum";
import { buildPublicUrl } from "src/common/utils/file-url.util";

export class ModelJobBaseDto implements IModelJobBase {
  @ApiProperty({ enum: ModelType, enumName: "ModelType" })
  model!: ModelType;

  @ApiProperty({ enum: ModelJobType, enumName: "ModelJobType" })
  type!: ModelJobType;

  @ApiProperty({ enum: ModelJobStatusType, enumName: "ModelJobStatusType" })
  status!: ModelJobStatusType;

  @Expose({ groups: [UserRole.Admin] })
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
  @Type(() => UserDto)
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
    description: "Сколько токенов списано за эту задачу",
  })
  tokensCharged!: number;

  @Expose({ groups: [UserRole.Admin] })
  @ApiProperty({
    type: Object,
    example: { width: 400, height: 300 },
    nullable: true,
  })
  usedTokens!: Record<string, any> | null;

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

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  resultsExpireAt!: Date | null;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  resultsDeletedAt!: Date | null;
}

export class ModelJobWithPreviewFileDto
  extends IntersectionType(ModelJobBaseDto, BaseDto)
  implements IModelJobBase
{
  @Expose()
  @ApiProperty({
    type: FileDto,
    nullable: true,
  })
  @Type(() => FileDto)
  outputPreviewFile!: FileDto | null;

  @Expose()
  @Transform(({ obj }) =>
    buildPublicUrl(obj.outputPreviewFile?.key, obj.outputPreviewFile?.bucket)
  )
  @ApiProperty({ type: String, format: "uri", nullable: true })
  outputPreviewFileUrl!: string | null;
}

export class ModelJobFullDto
  extends IntersectionType(ModelJobBaseDto, BaseDto)
  implements IModelJobBase
{
  @ApiProperty({
    type: FileDto,
    nullable: true,
  })
  @Type(() => FileDto)
  inputFile!: FileDto | null;

  @ApiProperty({
    type: String,
    example: "https://cdn.example.com/jobs/2025/09/19/5139b0d6-f38d-4af1.jpeg",
    nullable: true,
  })
  inputFileUrl!: string | null;

  @ApiProperty({
    type: FileDto,
    nullable: true,
  })
  @Type(() => FileDto)
  outputFile!: FileDto | null;

  @ApiProperty({
    type: String,
    example: "https://cdn.example.com/jobs/2025/09/19/5139b0d6-f38d-4af1.jpeg",
    nullable: true,
  })
  outputFileUrl!: string | null;

  @ApiProperty({
    type: FileDto,
    nullable: true,
  })
  @Type(() => FileDto)
  outputPreviewFile!: FileDto | null;

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
