import { ICategory } from "./types/category.interface";
import { Entity, Column } from "typeorm";
import { BaseEntity } from "src/common/base/base.entity";

@Entity("categories")
export class Category extends BaseEntity implements ICategory {
  @Column()
  name: string;

  @Column({ type: "text", nullable: true })
  description: string | null;
}
