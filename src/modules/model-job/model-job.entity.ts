import { IModelJob } from "./types/model-job.interface";
import { Entity, Column } from "typeorm";
import { BaseEntity } from "src/common/base/base.entity";
import {
  ModelJobStatusType,
  ModelJobType,
  ModelType,
} from "./types/model-job.enum";

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

  @Column({ type: "uuid", nullable: true })
  inputFileId: string | null;

  @Column({ type: "uuid", nullable: true })
  outputFileId: string | null;

  @Column({ type: "uuid", nullable: true })
  outputPreviewFileId: string | null;

  @Column({ type: "text", nullable: true })
  error: string | null;

  @Column({ type: "timestamptz", nullable: true })
  startedAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  finishedAt: Date | null;
}
