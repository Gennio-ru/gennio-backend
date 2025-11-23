import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { UserRole } from "./types/user-role.enum";
import { Exclude } from "class-transformer";

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 255, nullable: true, unique: true })
  email!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true, unique: true })
  yandexId!: string | null;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 32, nullable: true, unique: true })
  phone!: string | null;

  @Exclude()
  @Column({ type: "varchar", length: 255, nullable: true })
  passwordHash!: string | null;

  @Column({ type: "varchar", length: 16, default: UserRole.User })
  role!: UserRole;

  @Column({ type: "int", default: 0 })
  tokens!: number;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @Column({ type: "boolean", default: false })
  isEmailVerified!: boolean;

  @Column({ type: "boolean", default: false })
  isPhoneVerified!: boolean;

  // 🚫 Блокировка
  @Column({ type: "boolean", default: false })
  isBlocked!: boolean;

  @Column({ type: "timestamptz", nullable: true })
  blockedAt!: Date | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  blockedReason!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
