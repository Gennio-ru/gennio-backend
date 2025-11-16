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
  Query,
  BadRequestException,
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
import { AuthResponseDto } from "./dto/auth-response.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { UserDto } from "src/modules/users/dto/user.dto";
import { VerifyPhoneOtpDto } from "./dto/verify-otp-by-phone.dto";
import { Response } from "express";
import { UserId } from "src/common/decorators/user-id.decorator";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import { ResendConfirmEmailDto } from "./dto/resend-confirm-email.dto";

@ApiTags("auth")
@Controller("auth")
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  private readonly refreshCookieName = "refresh_token";

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

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

  @Get("email/confirm")
  async confirmEmail(
    @Query("userId") userId: string,
    @Query("token") token: string,
    @Res({ passthrough: true }) res: Response
  ): Promise<void> {
    if (!userId || !token) throw new BadRequestException("Missing parameters");

    const user = await this.authService.confirmEmailByLink(userId, token);

    // Авто-логин после подтверждения (можно выключить, если не надо)
    const { accessToken, refreshToken } = await (
      this.authService as any
    ).issueTokensAndPersistSession(user);
    this.setRefreshCookie(res, refreshToken);

    const frontendUrl =
      this.configService.get<string>("FRONTEND_URL") ??
      "http://localhost:5173/";
    const url = new URL(frontendUrl);
    url.hash = "email-confirmed";
    res.redirect(url.toString());
  }

  @Post("email/confirm/resend")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // не чаще 5 раз в минуту
  async resendConfirmLink(
    @Body() body: ResendConfirmEmailDto
  ): Promise<{ ok: true }> {
    await this.authService.resendConfirmEmail(body.email);
    return { ok: true };
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

  // OAuth Yandex
  // шаг 1 — редиректим пользователя на Яндекс
  @Get("yandex")
  redirectToYandex(
    @Res() res: Response,
    @Query("returnUrl") returnUrl?: string
  ): void {
    const clientId = this.configService.get<string>("YANDEX_CLIENT_ID");
    const redirectUri = this.configService.get<string>("YANDEX_REDIRECT_URI");
    if (!clientId || !redirectUri) {
      throw new BadRequestException("Yandex OAuth is not configured");
    }

    const url = new URL("https://oauth.yandex.ru/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", "login:email");

    // берём безопасный путь или корень
    const safeReturnPath = this.authService.getSafeReturnPath(returnUrl) ?? "/";

    // кладём в state (можно без encode, но так нагляднее)
    url.searchParams.set("state", encodeURIComponent(safeReturnPath));

    res.redirect(url.toString());
  }

  // шаг 2 — Яндекс возвращает code, обмениваем на токен
  @Get("yandex/callback")
  async yandexCallback(
    @Query("code") code: string,
    @Query("state") state: string | undefined,
    @Res({ passthrough: true }) res: Response
  ): Promise<void> {
    if (!code) {
      throw new BadRequestException("Missing code");
    }

    const { refreshToken } = await this.authService.handleYandexCallback(code);

    this.setRefreshCookie(res, refreshToken);

    const frontendBase =
      this.configService.get<string>("FRONTEND_URL") ?? "http://localhost:5173";

    // достаём безопасный путь из state
    const decodedState = state ? decodeURIComponent(state) : undefined;
    const safeReturnPath =
      this.authService.getSafeReturnPath(decodedState) ?? "/";

    // аккуратно собираем полный URL
    const redirectUrl = new URL(safeReturnPath, frontendBase).toString();

    res.redirect(redirectUrl);
  }
}
