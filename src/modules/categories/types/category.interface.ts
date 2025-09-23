import { ISchema } from "src/common/base/base.interface";

export interface ICategoryBase {
  name: string;
  description: string | null;
}

export interface ICategory extends ISchema, ICategoryBase {}
