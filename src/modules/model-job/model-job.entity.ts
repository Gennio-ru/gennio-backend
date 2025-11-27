import { IModelJob } from "./types/model-job.interface";
import { Entity, Column, ManyToOne, JoinColumn, RelationId } from "typeorm";
import { BaseEntity } from "src/common/base/base.entity";
import {
  ModelJobStatusType,
  ModelJobType,
  ModelType,
} from "./types/model-job.enum";
import { ModelTariffCode } from "../pricing/types/pricing.enum";
import { FileEntity } from "../files/files.entity";
import { User } from "../users/user.entity";

@Entity("model_jobs")
export class ModelJob extends BaseEntity implements IModelJob {
  @Column({ type: "enum", enum: ModelType })
  model: ModelType;

  @Column({ type: "enum", enum: ModelJobType })
  type: ModelJobType;

  @Column({ type: "enum", enum: ModelJobStatusType, default: "queued" })
  status: ModelJobStatusType;

  @Column({ type: "text", nullable: true })
  text: string | null;

  @Column({ type: "uuid", nullable: true })
  promptId: string | null;

  @Column({ type: "uuid" })
  userId: string;

  @ManyToOne(() => User, { onDelete: "NO ACTION" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ type: "uuid", nullable: true })
  inputFileId!: string | null;

  @ManyToOne(() => FileEntity, {
    onDelete: "SET NULL",
    nullable: true,
  })
  @JoinColumn({ name: "inputFileId" })
  inputFile!: FileEntity | null;

  @Column({ type: "uuid", nullable: true })
  outputFileId!: string | null;

  @ManyToOne(() => FileEntity, {
    onDelete: "SET NULL",
    nullable: true,
  })
  @JoinColumn({ name: "outputFileId" })
  outputFile!: FileEntity | null;

  @Column({ type: "uuid", nullable: true })
  outputPreviewFileId!: string | null;

  @ManyToOne(() => FileEntity, {
    onDelete: "SET NULL",
    nullable: true,
  })
  @JoinColumn({ name: "outputPreviewFileId" })
  outputPreviewFile!: FileEntity | null;

  @Column({ type: "text", nullable: true })
  outputText: string | null;

  @Column({ type: "enum", enum: ModelTariffCode })
  tariffCode: ModelTariffCode;

  @Column({ type: "int" })
  tokensCharged: number;

  @Column({ type: "jsonb", nullable: true })
  usedTokens!: Record<string, any> | null;

  @Column({ type: "text", nullable: true })
  error: string | null;

  @Column({ type: "timestamptz", nullable: true })
  startedAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  finishedAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  resultsExpireAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  resultsDeletedAt: Date | null;
}
