import { ISchema } from "src/common/base/base.interface";

export interface IFileBase {
  bucket: string;
  key: string;
  url: string;
  contentType: string;
  size: number;
  widthPx: number | null;
  heightPx: number | null;
  ownerId: string | null;
  meta: Record<string, any> | null;
}

export interface IFile extends ISchema, IFileBase {}
