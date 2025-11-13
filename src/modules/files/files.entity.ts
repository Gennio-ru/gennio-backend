import { BaseEntity } from "src/common/base/base.entity";
import { Column, Entity, Index } from "typeorm";
import { IFile } from "./types/file.interface";

@Entity("files")
export class FileEntity extends BaseEntity implements IFile {
  @Column({ length: 255 })
  bucket!: string;

  @Index()
  @Column({ length: 2048 })
  key!: string; // путь внутри бакета

  url!: string;

  @Column({
    type: "text",
    default: "application/octet-stream",
  })
  contentType!: string;

  @Column({ type: "int" })
  size!: number;

  @Column({ type: "int", name: "width_px", nullable: true })
  widthPx!: number | null;

  @Column({ type: "int", name: "height_px", nullable: true })
  heightPx!: number | null;

  @Index()
  @Column({ type: "uuid", nullable: true })
  ownerId!: string | null; // если нужен владелец

  @Column({ type: "jsonb", nullable: true })
  meta!: Record<string, any> | null;
}
