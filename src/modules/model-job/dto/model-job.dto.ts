import { ApiProperty, IntersectionType } from "@nestjs/swagger";
import { IModelJob, IModelJobBase } from "../types/model-job.interface";
import {
  ModelJobStatusType,
  ModelJobTariffCode,
  ModelJobType,
  ModelType,
} from "../types/model-job.enum";
import { BaseDto } from "src/common/base/base.dto";
import { UserDto } from "src/modules/users/dto/user.dto";
import { FileDto } from "src/modules/files/dto/file.dto";
import { Expose, Transform, Type } from "class-transformer";
import { UserRole } from "src/modules/users/types/user-role.enum";
import { buildPublicUrl } from "src/common/utils/file-url.util";
import { PromptDto } from "src/modules/prompts/dto/prompt.dto";
import { ModelJobFile } from "../model-job-file.entity";

function mapUrls(files?: FileDto[] | null): string[] {
  if (!files?.length) return [];
  return files
    .map((f) => buildPublicUrl(f?.key, f?.bucket))
    .filter((x): x is string => !!x);
}

export class ModelJobBaseDto implements IModelJobBase {
  @ApiProperty({ enum: ModelType, enumName: "ModelType" })
  model!: ModelType;

  @ApiProperty({ enum: ModelJobType, enumName: "ModelJobType" })
  type!: ModelJobType;

  @ApiProperty({ enum: ModelJobStatusType, enumName: "ModelJobStatusType" })
  status!: ModelJobStatusType;

  @ApiProperty({ type: String, nullable: true })
  text: string | null;

  @ApiProperty({ type: String, nullable: true, example: "2:3" })
  aspectRatio: string | null;

  @ApiProperty({ type: String, nullable: true, example: "1K" })
  imageSize: string | null;

  @ApiProperty({ type: String, nullable: true })
  promptId: string | null;

  @ApiProperty({ type: () => PromptDto, nullable: true })
  @Type(() => PromptDto)
  prompt!: PromptDto | null;

  @ApiProperty({ example: "user-123" })
  userId!: string;

  @ApiProperty({ type: () => UserDto, nullable: true })
  @Type(() => UserDto)
  user!: UserDto | null;

  @ApiProperty({ type: [ModelJobFile], nullable: true })
  files: ModelJobFile[] | null;

  @ApiProperty({ type: String, nullable: true })
  outputText: string | null;

  @Expose({ groups: [UserRole.Admin] })
  @ApiProperty({
    enum: ModelJobTariffCode,
    enumName: "ModelJobTariffCode",
  })
  tariffCode!: ModelJobTariffCode;

  @ApiProperty({ type: Number, example: 8 })
  tokensCharged!: number;

  @Expose({ groups: [UserRole.Admin] })
  @ApiProperty({ type: Object, nullable: true })
  usedTokens!: Record<string, any> | null;

  @ApiProperty({ type: String, nullable: true })
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

export class ModelJobWithPreviewFileDto extends IntersectionType(
  ModelJobBaseDto,
  BaseDto
) {
  @ApiProperty({ type: [FileDto], nullable: true })
  @Type(() => FileDto)
  outputPreviewFiles!: FileDto[] | null;

  @ApiProperty({ type: [String], format: "uri", nullable: true })
  outputPreviewFileUrls!: string[] | null;
}

export class ModelJobFullDto
  extends IntersectionType(ModelJobBaseDto, BaseDto)
  implements IModelJobBase
{
  @ApiProperty({ type: [FileDto], nullable: true })
  @Type(() => FileDto)
  inputFiles!: FileDto[] | null;

  @ApiProperty({ type: [String], format: "uri", nullable: true })
  inputFileUrls!: string[] | null;

  @ApiProperty({ type: [FileDto], nullable: true })
  @Type(() => FileDto)
  outputFiles!: FileDto[] | null;

  @ApiProperty({ type: [String], format: "uri", nullable: true })
  outputFileUrls!: string[] | null;

  @ApiProperty({ type: [FileDto], nullable: true })
  @Type(() => FileDto)
  outputPreviewFiles!: FileDto[] | null;

  @ApiProperty({ type: [String], format: "uri", nullable: true })
  outputPreviewFileUrls!: string[] | null;
}

export class ModelJobDto
  extends IntersectionType(ModelJobBaseDto, BaseDto)
  implements IModelJob {}
