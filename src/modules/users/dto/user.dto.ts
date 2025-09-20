import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
} from "@nestjs/swagger";
import { BaseDto } from "src/common/base/base.dto";
import { UserRole } from "src/modules/users/types/user-role.enum";
import { IUser, IUserBase } from "../types/user.interface";

export class UserBaseDto extends BaseDto implements IUserBase {
  @ApiPropertyOptional({
    type: String,
    example: "user@example.com",
    nullable: true,
  })
  email!: string | null;

  @ApiPropertyOptional({
    type: String,
    example: "+79998887766",
    nullable: true,
  })
  phone!: string | null;

  @ApiHideProperty()
  passwordHash!: string | null;

  @ApiProperty({ enum: UserRole, example: UserRole.User, enumName: "UserRole" })
  role!: UserRole;

  @ApiProperty({ example: 100, description: "Баланс кредитов" })
  credits!: number;

  @ApiProperty({ example: true, description: "Активен ли пользователь" })
  isActive!: boolean;

  @ApiProperty({ example: false })
  isEmailVerified!: boolean;

  @ApiProperty({ example: true })
  isPhoneVerified!: boolean;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  lastLoginAt?: Date;
}

export class UserDto
  extends IntersectionType(UserBaseDto, BaseDto)
  implements IUser {}
