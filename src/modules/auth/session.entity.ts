// src/modules/auth/session.entity.ts (или где она у тебя лежала)
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "../users/user.entity";

@Entity("sessions")
@Index("UQ_sessions_jti", ["jti"], { unique: true })
@Index("IDX_sessions_userId", ["userId"])
export class Session {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  userId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE", eager: true })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", length: 64 })
  jti: string;

  @Column({ type: "varchar", length: 100 }) // bcrypt ~60, берём с запасом
  refreshTokenHash: string;

  @Column({ type: "timestamptz" })
  expiresAt: Date;

  @Column({ type: "varchar", length: 512, nullable: true })
  userAgent?: string;

  @Column({ type: "varchar", length: 45, nullable: true })
  ip?: string;

  @Column({ type: "timestamptz", nullable: true })
  revokedAt?: Date;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
