import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class BlockUserDto {
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: "Спам / злоупотребление сервисом",
    description: "Причина блокировки (опционально)",
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  reason?: string | null;
}
