// dto/file-base.dto.ts
import {
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
} from "@nestjs/swagger";
import { IFile, IFileBase } from "../types/file.interface";
import { BaseDto } from "src/common/base/base.dto";
import { Expose } from "class-transformer";

export class FileBaseDto implements IFileBase {
  @Expose()
  @ApiProperty({ example: "uploads/2025/09/04/photo.png" })
  key!: string;

  @Expose()
  @ApiProperty({ example: "my-bucket" })
  bucket!: string;

  @Expose()
  @ApiPropertyOptional({
    example: "https://cdn.example.com/uploads/2025/09/04/photo.png",
    format: "uri",
    nullable: true,
  })
  url!: string;

  @Expose()
  @ApiPropertyOptional({ example: "image/png" })
  contentType!: string;

  @Expose()
  @ApiPropertyOptional({
    example: 204800,
    description: "Размер файла в байтах",
  })
  size!: number;

  @Expose()
  @ApiPropertyOptional({
    type: Number,
    example: 1024,
    description: "Ширина файла в пикселях",
    nullable: true,
  })
  widthPx!: number | null;

  @Expose()
  @ApiPropertyOptional({
    type: Number,
    example: 768,
    description: "Высота файла в пикселях",
    nullable: true,
  })
  heightPx!: number | null;

  @Expose()
  @ApiPropertyOptional({ example: "user-123", nullable: true })
  ownerId!: string | null;

  @ApiPropertyOptional({
    type: Object,
    example: { width: 400, height: 300 },
    nullable: true,
  })
  meta!: Record<string, any> | null;
}

export class FileDto
  extends IntersectionType(FileBaseDto, BaseDto)
  implements IFile {}
