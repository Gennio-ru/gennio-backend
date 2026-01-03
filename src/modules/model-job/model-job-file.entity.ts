import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from "typeorm";
import { BaseEntity } from "src/common/base/base.entity";
import { ModelJob } from "./model-job.entity";
import { FileEntity } from "../files/files.entity";
import { ModelJobFileKind } from "./types/model-job.enum";

@Entity("model_job_files")
@Index(["modelJobId", "kind"])
@Index(["fileId"])
@Unique(["modelJobId", "kind", "position"])
export class ModelJobFile extends BaseEntity {
  @Column({ type: "uuid" })
  modelJobId!: string;

  @ManyToOne(() => ModelJob, (job) => job.files, { onDelete: "CASCADE" })
  @JoinColumn({ name: "modelJobId" })
  modelJob!: ModelJob;

  @Column({ type: "uuid" })
  fileId!: string;

  // если файл удалён — связь тоже удалится
  @ManyToOne(() => FileEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "fileId" })
  file!: FileEntity;

  @Column({ type: "enum", enum: ModelJobFileKind })
  kind!: ModelJobFileKind;

  // порядок (0..n-1)
  @Column({ type: "int" })
  position!: number;
}
