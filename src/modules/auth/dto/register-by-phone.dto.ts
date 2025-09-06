import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsPhoneNumber } from "class-validator";

export class RegisterByPhoneDto {
  @ApiProperty({ example: "+79998887766" })
  @IsPhoneNumber("RU") // можно поставить "ZZ" для любых номеров
  phone!: string;

  @ApiProperty({
    example: "secretPassword123",
    required: false,
    description: "Пароль (необязателен, если используется вход по OTP)",
  })
  @IsOptional()
  password?: string;
}
