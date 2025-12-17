import { IModelJob } from "./types/model-job.interface";
import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  RelationId,
  OneToMany,
} from "typeorm";
import { BaseEntity } from "src/common/base/base.entity";
import {
  ModelJobStatusType,
  ModelJobTariffCode,
  ModelJobType,
  ModelType,
} from "./types/model-job.enum";
import { FileEntity } from "../files/files.entity";
import { User } from "../users/user.entity";
import { Prompt } from "../prompts/prompt.entity";
import { ModelJobFile } from "./model-job-file.entity";

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

  @Column({ type: "varchar", length: 10, nullable: true })
  aspectRatio: string | null;

  @Column({ type: "varchar", length: 10, nullable: true })
  imageSize: string | null;

  @Column({ type: "uuid", nullable: true })
  promptId: string | null;

  @ManyToOne(() => Prompt)
  @JoinColumn({ name: "promptId" })
  prompt!: Prompt;

  @Column({ type: "uuid" })
  userId: string;

  @ManyToOne(() => User, { onDelete: "NO ACTION" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @OneToMany(() => ModelJobFile, (x) => x.modelJob)
  files!: ModelJobFile[];

  @Column({ type: "text", nullable: true })
  outputText: string | null;

  @Column({
    type: "enum",
    enum: ModelJobTariffCode,
    default: ModelJobTariffCode.User,
  })
  tariffCode: ModelJobTariffCode;

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
