import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ErrorCode } from "./error-code.enum";

export class ErrorInfoDto {
  @ApiProperty({ enum: ErrorCode, enumName: "ErrorCode" })
  code!: ErrorCode;

  @ApiPropertyOptional({
    description:
      "Может быть undefined для бизнес-ошибок, фронт сам локализует по code",
    example: "Internal server error",
  })
  message?: string;

  @ApiPropertyOptional({
    description: "Доп. детали, например { required: 10 }",
  })
  details?: any;
}

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success!: boolean;

  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ type: ErrorInfoDto })
  error!: ErrorInfoDto;

  @ApiProperty({ example: "/api/model-job/start-image-edit-by-prompt-id" })
  path!: string;

  @ApiProperty({ example: "2025-11-12T22:31:59.153Z" })
  timestamp!: string;
}
