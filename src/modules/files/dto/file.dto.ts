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
  @ApiPropertyOptional({
    example: "https://cdn.example.com/uploads/2025/09/04/photo.png",
    format: "uri",
    nullable: true,
  })
  url!: string | null;

  @Expose()
  @ApiPropertyOptional({ example: "image/png", nullable: true })
  contentType!: string | null;

  @Expose()
  @ApiPropertyOptional({
    example: 204800,
    description: "Размер файла в байтах",
  })
  size!: number | null;

  @Expose()
  @ApiProperty({ example: "my-bucket" })
  bucket!: string;

  @Expose()
  @ApiPropertyOptional({ example: "user-123", nullable: true })
  ownerId!: string | null;

  @Expose()
  @ApiPropertyOptional({
    example: { width: 400, height: 300 },
    nullable: true,
  })
  meta!: Record<string, any> | null;
}

export class FileDto
  extends IntersectionType(FileBaseDto, BaseDto)
  implements IFile {}
