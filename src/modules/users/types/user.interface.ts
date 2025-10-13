import { ISchema } from "src/common/base/base.interface";
import { UserRole } from "./user-role.enum";

export interface IUserBase {
  email: string | null;
  yandexId: string | null;
  phone: string | null;
  passwordHash: string | null;
  role: UserRole;
  credits: number;
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  lastLoginAt?: Date;
}

export interface IUser extends ISchema, IUserBase {}
