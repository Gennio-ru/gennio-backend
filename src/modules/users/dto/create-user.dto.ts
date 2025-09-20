import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import { UserRole } from "src/modules/users/types/user-role.enum";

export class CreateUserDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  // Разрешай передавать роль только админам (контроллером, а не валидатором)
  @ApiPropertyOptional({
    enum: UserRole,
    default: UserRole.User,
    enumName: "UserRole",
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole = UserRole.User;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
