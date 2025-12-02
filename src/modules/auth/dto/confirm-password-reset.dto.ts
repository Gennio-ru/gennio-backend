import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class ConfirmPasswordResetDto {
  @ApiProperty({ example: "f4581a6a-a33a-48cd-a07b-5638d9f7c649" })
  @IsString()
  userId!: string;

  @ApiProperty({
    example: "b471548384c7428bb90a8e8e5c2b9c2f1e3b4a8760f8d12e8fa7b2c2f48a8d91",
  })
  @IsString()
  token!: string;

  @ApiProperty({
    example: "NewStrongPassword123!",
    description: "Новый пароль пользователя",
  })
  @IsNotEmpty({ message: "Пароль обязателен" })
  @MinLength(8, { message: "Пароль должен содержать минимум 8 символов" })
  @MaxLength(64, { message: "Пароль не должен превышать 64 символа" })
  password!: string;
}
