import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, MaxLength, MinLength } from "class-validator";

export class RegisterByEmailDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail({}, { message: "Некорректный email" })
  email!: string;

  @ApiProperty({ example: "ПарольПароль123!" })
  @IsNotEmpty({ message: "Пароль обязателен" })
  @MinLength(8, { message: "Пароль должен содержать минимум 8 символов" })
  @MaxLength(64, { message: "Пароль не должен превышать 64 символа" })
  password!: string;
}
