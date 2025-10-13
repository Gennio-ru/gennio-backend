import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "src/modules/users/users.service";
import { User } from "src/modules/users/user.entity";
import { RegisterByEmailDto } from "./dto/register-by-email.dto";
import { RegisterByPhoneDto } from "./dto/register-by-phone.dto";
import { LoginByEmailDto } from "./dto/login-by-email.dto";
import { LoginByPhoneDto } from "./dto/login-by-phone.dto";
import { RequestPhoneOtpDto } from "./dto/request-otp-by-phone.dto";
import { MailService } from "../mail/mail.service";
import { VerifyPhoneOtpDto } from "./dto/verify-otp-by-phone.dto";
import { OtpStore } from "./otp.store";
import { Session } from "./session.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

@Injectable()
export class AuthService {
  private readonly OTP_TTL_MIN = 5;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly otpStore: OtpStore,
    private readonly configService: ConfigService,
    @InjectRepository(Session)
    private readonly sessionsRepository: Repository<Session>
  ) {}

  private parseTtl(s: string): number {
    const m = /^(\d+)([smhd])$/.exec(s);
    if (!m) return 24 * 60 * 60 * 1000;
    const n = Number(m[1]);
    const mult =
      m[2] === "s" ? 1e3 : m[2] === "m" ? 6e4 : m[2] === "h" ? 3.6e6 : 8.64e7;
    return n * mult;
  }

  private hmacSha256Hex(token: string, secret: string) {
    return crypto.createHmac("sha256", secret).update(token).digest("hex");
  }

  private signAccessToken(user: User): string {
    const payload = {
      sub: user.id,
      role: user.role,
      email: user.email,
      phone: user.phone,
      credits: user.credits,
      isActive: user.isActive,
    };
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET || "dev-secret",
      expiresIn: process.env.JWT_ACCESS_TTL || "7d",
    });
  }

  /** Выдать access+refresh и сохранить сессию в БД */
  private async issueTokensAndPersistSession(
    user: User,
    ctx?: { ip?: string; ua?: string }
  ) {
    const accessToken = this.signAccessToken(user);

    // jti для refresh-токена
    const jti = crypto.randomUUID();
    // генерируем refresh JWT (или можешь сделать просто рандомную строку)
    const refreshToken = this.jwtService.sign(
      { sub: user.id, jti },
      {
        secret: process.env.JWT_REFRESH_SECRET || "dev-refresh",
        expiresIn: process.env.JWT_REFRESH_TTL || "30d",
      }
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    // вычислим expiresAt (из exp токена, если хочешь строго)
    const expSec = (this.jwtService.decode(refreshToken) as any)?.exp;
    const expiresAt = expSec
      ? new Date(expSec * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.sessionsRepository.save(
      this.sessionsRepository.create({
        user: { id: user.id } as any, // достаточно id
        jti,
        refreshTokenHash,
        expiresAt,
        ip: ctx?.ip,
        userAgent: ctx?.ua,
      })
    );

    return { accessToken, refreshToken, user };
  }

  // === Регистрация по email+пароль, с отправкой письма ===
  async registerByEmail(dto: RegisterByEmailDto) {
    const user = await this.usersService.createByEmail(dto.email, dto.password);
    await this.usersService.markLastLogin(user.id);

    await this.sendEmailConfirmForUser(user);

    // Управляем поведением флагом:
    const requireConfirm =
      (this.configService.get("REQUIRE_EMAIL_CONFIRM_BEFORE_LOGIN") ??
        "false") === "true";

    if (requireConfirm) {
      // Ничего не выдаём, пока не подтвердит почту (фронт покажет экран “проверьте почту”)
      return {
        accessToken: undefined as any,
        refreshToken: undefined as any,
        user,
      };
    }

    // Иначе — логиним как раньше
    return this.issueTokensAndPersistSession(user);
  }

  async registerByPhone(dto: RegisterByPhoneDto) {
    const user = await this.usersService.createByPhone(dto.phone, dto.password);
    await this.usersService.markLastLogin(user.id);
    return this.issueTokensAndPersistSession(user);
  }

  async loginByEmail(dto: LoginByEmailDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.passwordHash)
      throw new UnauthorizedException("Invalid credentials");
    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException("Invalid credentials");

    await this.usersService.markLastLogin(user.id);
    return this.issueTokensAndPersistSession(user);
  }

  async loginByPhone(dto: LoginByPhoneDto) {
    const user = await this.usersService.findByPhone(dto.phone);
    if (!user || !user.passwordHash)
      throw new UnauthorizedException("Invalid credentials");
    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException("Invalid credentials");

    await this.usersService.markLastLogin(user.id);
    return this.issueTokensAndPersistSession(user);
  }

  /** Запрос OTP по телефону (пока заглушка SMS). */
  async requestPhoneOtp({ phone }: RequestPhoneOtpDto) {
    const code = crypto.randomInt(100000, 999999).toString();
    const ttlSec = this.OTP_TTL_MIN * 60;

    console.log(`Generated code is - ${code}`);

    await this.otpStore.set("phone", phone, code, ttlSec);

    // TODO: отправка через SMS-провайдера; пока лог:
    // eslint-disable-next-line no-console
    console.log(`[OTP] phone=${phone} code=${code}`);

    const isDev = process.env.NODE_ENV !== "production";
    return { ok: true, ...(isDev ? { debugCode: code } : {}) };
  }

  /** Верификация OTP по телефону (атомарная проверка + одноразовое погашение). */
  async verifyPhoneOtp(dto: VerifyPhoneOtpDto) {
    const res = await this.otpStore.compareAndConsume(
      "phone",
      dto.phone,
      dto.code
    );
    if (res === -1) throw new BadRequestException("OTP not requested");
    if (res === 0) throw new BadRequestException("Invalid OTP");

    let user = await this.usersService.findByPhone(dto.phone);
    if (!user) user = await this.usersService.createByPhone(dto.phone);

    if (!user.isPhoneVerified) {
      await this.usersService.setPhoneVerified(user.id, true);
      user = await this.usersService.findById(user.id);
    }

    await this.usersService.markLastLogin(user.id);
    return this.issueTokensAndPersistSession(user);
  }

  async me(userId: string) {
    const user = await this.usersService.findById(userId);
    return user;
  }

  async refresh(refreshToken?: string) {
    if (!refreshToken) throw new UnauthorizedException("No refresh token");
    // Verify signature and get payload
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || "dev-refresh",
        ignoreExpiration: false,
      });
    } catch (e) {
      throw new UnauthorizedException("Invalid refresh token");
    }
    const jti: string | undefined = payload?.jti;
    const userId: string | undefined = payload?.sub;
    if (!jti || !userId)
      throw new UnauthorizedException("Malformed refresh token");

    // Check session exists and matches token hash
    const session = await this.sessionsRepository.findOne({ where: { jti } });
    if (!session || session.revokedAt)
      throw new UnauthorizedException("Session revoked");

    // сравниваем именно через bcrypt (мы же так и сохраняли)
    const ok = await bcrypt.compare(refreshToken, session.refreshTokenHash);
    if (!ok) throw new UnauthorizedException("Token mismatch");

    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      throw new UnauthorizedException("Session expired");
    }

    // Load user
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive)
      throw new UnauthorizedException("User inactive");

    // Revoke old session
    session.revokedAt = new Date();
    await this.sessionsRepository.save(session);

    // Issue fresh tokens & persist new session
    return this.issueTokensAndPersistSession(user);
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) return;
    try {
      const payload: any = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || "dev-refresh",
        ignoreExpiration: true,
      });
      const jti: string | undefined = payload?.jti;
      if (!jti) return;
      const session = await this.sessionsRepository.findOne({ where: { jti } });
      if (!session) return;
      session.revokedAt = new Date();
      await this.sessionsRepository.save(session);
    } catch {
      // ignore
    }
  }

  async handleYandexCallback(code: string) {
    const tokenUrl = "https://oauth.yandex.ru/token";
    const infoUrl = "https://login.yandex.ru/info";

    // 1️⃣ Обмен кода на токен
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: this.configService.get("YANDEX_CLIENT_ID") || "",
      client_secret: this.configService.get("YANDEX_CLIENT_SECRET") || "",
    });

    const tokenRes = await axios.post(tokenUrl, params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const accessToken = tokenRes.data.access_token;

    // 2️⃣ Запрашиваем профиль
    const profileRes = await axios.get(infoUrl, {
      headers: { Authorization: `OAuth ${accessToken}` },
    });

    const profile = profileRes.data;

    // 3️⃣ Ищем или создаём пользователя
    let user = await this.usersService.findByYandexId(profile.id);

    if (!user) {
      user = await this.usersService.createByYandexId({
        yandexId: profile.id,
        email: profile.default_email ?? null,
        isEmailVerified: !!profile.default_email,
      });
    }

    await this.usersService.markLastLogin(user.id);
    return this.issueTokensAndPersistSession(user);
  }

  /** Отправить ссылку подтверждения email (Redis) */
  async sendEmailConfirmForUser(user: User) {
    if (!user.email) return;

    const raw = crypto.randomBytes(32).toString("hex");
    const ttlMs = this.parseTtl(
      this.configService.get("EMAIL_CONFIRM_TTL") || "24h"
    );
    const ttlSec = Math.floor(ttlMs / 1000);
    const expireHours = Math.ceil(ttlSec / 3600);
    const secret =
      this.configService.get("EMAIL_CONFIRM_SECRET") || "dev-email-confirm";

    const digest = this.hmacSha256Hex(raw, secret);
    await this.otpStore.setHashed("email_confirm", user.id, digest, ttlSec);

    const base =
      this.configService.get("EMAIL_CONFIRM_BASE_URL") ||
      "http://localhost:3000/api/auth/email/confirm";
    const url = new URL(base);
    url.searchParams.set("userId", user.id);
    url.searchParams.set("token", raw);

    await this.mailService.sendEmailConfirmLink({
      to: user.email,
      link: url.toString(),
      project: "Gennio",
      expireHours,
      supportEmail: "support@gennio.ru",
    });
  }

  /** Подтвердить email по ссылке */
  async confirmEmailByLink(userId: string, rawToken: string) {
    const secret =
      this.configService.get("EMAIL_CONFIRM_SECRET") || "dev-email-confirm";
    const digest = this.hmacSha256Hex(rawToken, secret);

    const res = await this.otpStore.compareHashedAndConsume(
      "email_confirm",
      userId,
      digest
    );
    if (res === -1) throw new BadRequestException("Ссылка устарела");
    if (res === 0) throw new BadRequestException("Неверная ссылка");

    const user = await this.usersService.findById(userId);
    if (!user) throw new BadRequestException("Пользователь не найден");

    if (!user.isEmailVerified) {
      await this.usersService.setEmailVerified(user.id, true);
    }
    return user;
  }
}
