import { PromptType } from "src/modules/prompts/types/prompt-type.enum";
import { IPrompt } from "./types/prompt.interface";
import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { FileEntity } from "../files/files.entity";
import { BaseEntity } from "src/common/base/base.entity";
import { Category } from "../categories/category.entity";

@Entity("prompts")
export class Prompt extends BaseEntity implements IPrompt {
  @Column()
  title: string;

  @Column({ type: "text" })
  description: string;

  @Column({ type: "uuid", nullable: true })
  beforeImageId: string | null;

  @ManyToOne(() => FileEntity, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "beforeImageId" })
  beforeImage: FileEntity;

  @Column({ type: "uuid" })
  afterImageId: string;

  @ManyToOne(() => FileEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "afterImageId" })
  afterImage: FileEntity;

  @Column({
    type: "enum",
    enum: PromptType,
    default: PromptType.ImageToImage,
  })
  type: PromptType;

  @Column({ type: "text", default: "" })
  text: string;

  @Column({ type: "uuid", nullable: true })
  categoryId: string | null;

  @ManyToOne(() => Category, { onDelete: "SET NULL" })
  @JoinColumn({ name: "categoryId" })
  category: Category;
}
