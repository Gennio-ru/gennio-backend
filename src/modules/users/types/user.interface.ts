import { ISchema } from "src/common/base/base.interface";
import { UserRole } from "./user-role.enum";

export interface IUserBase {
  email: string | null;
  yandexId: string | null;
  phone: string | null;
  passwordHash: string | null;
  role: UserRole;
  tokens: number;
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isBlocked: boolean;
  blockedAt: Date | null;
  blockedReason: string | null;
  lastLoginAt?: Date;
}

export interface IUser extends ISchema, IUserBase {}
