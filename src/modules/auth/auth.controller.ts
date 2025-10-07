import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Res,
  HttpCode,
  ClassSerializerInterceptor,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { RegisterByEmailDto } from "./dto/register-by-email.dto";
import { RegisterByPhoneDto } from "./dto/register-by-phone.dto";
import { LoginByEmailDto } from "./dto/login-by-email.dto";
import { LoginByPhoneDto } from "./dto/login-by-phone.dto";
import { RequestPhoneOtpDto } from "./dto/request-otp-by-phone.dto";
import { VerifyEmailOtpDto } from "./dto/verify-otp-by-email.dto";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { UserDto } from "src/modules/users/dto/user.dto";
import { RequestEmailOtpDto } from "./dto/request-otp-by-email.dto";
import { VerifyPhoneOtpDto } from "./dto/verify-otp-by-phone.dto";
import { Response } from "express";
import { UserId } from "src/common/decorators/user-id.decorator";

@ApiTags("auth")
@Controller("auth")
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  private readonly refreshCookieName = "refresh_token";

  constructor(private readonly authService: AuthService) {}

  private parseTtl(s: string): number {
    const m = /^(\d+)([smhd])$/.exec(s);
    if (!m) return 7 * 24 * 60 * 60 * 1000;
    const n = Number(m[1]);
    const mult =
      m[2] === "s"
        ? 1_000
        : m[2] === "m"
        ? 60_000
        : m[2] === "h"
        ? 3_600_000
        : 86_400_000;
    return n * mult;
  }
  private cookieOptions() {
    const secure = (process.env.COOKIE_SECURE ?? "false") === "true";
    const sameSite = secure ? ("none" as const) : ("lax" as const);
    const domain = process.env.COOKIE_DOMAIN || undefined;
    const path = process.env.COOKIE_PATH || "/api/auth"; // учти глобальный префикс /api
    const ttl = process.env.JWT_REFRESH_TTL || "30d";
    return {
      httpOnly: true,
      secure,
      sameSite,
      domain,
      path,
      maxAge: this.parseTtl(ttl),
    };
  }
  private setRefreshCookie(res: Response, token: string) {
    res.cookie(this.refreshCookieName, token, this.cookieOptions());
  }
  private clearRefreshCookie(res: Response) {
    const opts = this.cookieOptions();
    res.clearCookie(this.refreshCookieName, { ...opts, maxAge: 0 });
  }

  @Post("register/email")
  async registerByEmail(
    @Body() dto: RegisterByEmailDto,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthResponseDto> {
    const { accessToken, refreshToken, user } =
      await this.authService.registerByEmail(dto);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken, user };
  }

  @Post("register/phone")
  async registerByPhone(
    @Body() dto: RegisterByPhoneDto,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthResponseDto> {
    const { accessToken, refreshToken, user } =
      await this.authService.registerByPhone(dto);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken, user };
  }

  @Post("login/email")
  @ApiOperation({ summary: "Логин по email + пароль" })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async loginByEmail(
    @Body() dto: LoginByEmailDto,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthResponseDto> {
    const { accessToken, refreshToken, user } =
      await this.authService.loginByEmail(dto);

    this.setRefreshCookie(res, refreshToken);
    return { accessToken, user };
  }

  @Post("login/phone")
  @ApiOperation({ summary: "Логин по телефону + пароль" })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async loginByPhone(
    @Body() dto: LoginByPhoneDto,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthResponseDto> {
    const { accessToken, refreshToken, user } =
      await this.authService.loginByPhone(dto);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken, user };
  }

  @Post("login/email/otp/request")
  @ApiOperation({ summary: "Запросить OTP-код для email" })
  @ApiResponse({ status: 200, schema: { example: { ok: true } } })
  async requestEmailOtp(
    @Body() dto: RequestEmailOtpDto
  ): Promise<{ ok: boolean }> {
    return this.authService.requestEmailOtp(dto);
  }

  @Post("login/phone/otp/request")
  @ApiOperation({ summary: "Запросить OTP-код для телефона" })
  @ApiResponse({ status: 200, schema: { example: { ok: true } } })
  async requestPhoneOtp(
    @Body() dto: RequestPhoneOtpDto
  ): Promise<{ ok: boolean }> {
    return this.authService.requestPhoneOtp(dto);
  }

  @Post("login/phone/otp/verify")
  async verifyPhoneOtp(
    @Body() dto: VerifyPhoneOtpDto,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthResponseDto> {
    const { accessToken, refreshToken, user } =
      await this.authService.verifyPhoneOtp(dto);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken, user };
  }

  @Post("login/email/otp/verify")
  async verifyEmailOtp(
    @Body() dto: VerifyEmailOtpDto,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthResponseDto> {
    const { accessToken, refreshToken, user } =
      await this.authService.verifyEmailOtp(dto);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken, user };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Текущий пользователь" })
  @ApiResponse({ status: 200, type: UserDto })
  async me(@UserId() userId: string): Promise<UserDto> {
    return this.authService.me(userId);
  }

  @Post("refresh")
  @ApiCookieAuth()
  @ApiOperation({ summary: "Обновить access-токен по refresh (cookie)" })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthResponseDto> {
    // refresh-кука приходит HttpOnly
    const token = (req as any).cookies?.[this.refreshCookieName] as
      | string
      | undefined;
    const out = await this.authService.refresh(token);
    this.setRefreshCookie(res, out.refreshToken); // ротация
    return { accessToken: out.accessToken, user: out.user };
  }

  @Post("logout")
  @ApiCookieAuth()
  @ApiOperation({ summary: "Выйти и отозвать сессию" })
  @ApiResponse({ status: 200, schema: { example: { ok: true } } })
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<{ ok: boolean }> {
    const token = (req as any).cookies?.[this.refreshCookieName] as
      | string
      | undefined;
    await this.authService.logout(token);
    this.clearRefreshCookie(res);
    return { ok: true };
  }
}
