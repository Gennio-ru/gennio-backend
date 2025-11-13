import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UploadFileResponseDto {
  @ApiProperty({ example: "f47ac10b-58cc-4372-a567-0e02b2c3d479" })
  id: string;

  @ApiProperty({ example: "uploads/2025/09/04/file.png" })
  key: string;

  @ApiProperty({
    example: "https://cdn.example.com/uploads/2025/09/04/file.png",
  })
  url: string;

  @ApiProperty({ example: "image/png", nullable: true })
  contentType: string | null;

  @ApiProperty({ example: 204800, description: "Размер файла в байтах" })
  size: number | null;

  @ApiPropertyOptional({
    example: 1024,
    description: "Ширина файла в пикселях",
    nullable: true,
  })
  widthPx!: number | null;

  @ApiPropertyOptional({
    example: 768,
    description: "Высота файла в пикселях",
    nullable: true,
  })
  heightPx!: number | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;
}
