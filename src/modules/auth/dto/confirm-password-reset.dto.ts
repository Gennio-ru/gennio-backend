import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

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
  @IsString()
  @MinLength(8)
  password!: string;
}
