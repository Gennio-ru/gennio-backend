import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
} from "@nestjs/swagger";
import { BaseDto } from "src/common/base/base.dto";
import { UserRole } from "src/modules/users/types/user-role.enum";
import { IUser, IUserBase } from "../types/user.interface";
import { Exclude, Expose } from "class-transformer";

export class UserBaseDto extends BaseDto implements IUserBase {
  @ApiPropertyOptional({
    type: String,
    example: "user@example.com",
    nullable: true,
  })
  email!: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
  })
  yandexId!: string | null;

  @ApiPropertyOptional({
    type: String,
    example: "+79998887766",
    nullable: true,
  })
  phone!: string | null;

  @Exclude()
  @ApiHideProperty()
  passwordHash!: string | null;

  @ApiProperty({ enum: UserRole, example: UserRole.User, enumName: "UserRole" })
  role!: UserRole;

  @ApiProperty({ example: 100, description: "Баланс кредитов" })
  tokens!: number;

  @ApiProperty({ example: true, description: "Активен ли пользователь" })
  isActive!: boolean;

  @ApiProperty({ example: false, description: "Подтверждён ли email" })
  isEmailVerified!: boolean;

  @ApiProperty({ example: true, description: "Подтверждён ли телефон" })
  isPhoneVerified!: boolean;

  // 🔐 Блокировка

  @ApiProperty({
    example: false,
    description: "Заблокирован ли пользователь",
  })
  isBlocked!: boolean;

  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    nullable: true,
    description: "Дата блокировки пользователя",
  })
  blockedAt!: Date | null;

  @Expose({ groups: [UserRole.Admin] })
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: "Причина блокировки (видна только администраторам)",
  })
  blockedReason!: string | null;

  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    nullable: true,
  })
  lastLoginAt?: Date;
}

export class UserDto
  extends IntersectionType(UserBaseDto, BaseDto)
  implements IUser {}
