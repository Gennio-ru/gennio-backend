import { Controller, Post, Body, Get, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
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

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register/email")
  @ApiOperation({ summary: "Регистрация по email + пароль" })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  async registerByEmail(
    @Body() dto: RegisterByEmailDto
  ): Promise<AuthResponseDto> {
    return this.authService.registerByEmail(dto);
  }

  @Post("register/phone")
  @ApiOperation({ summary: "Регистрация по телефону (пароль опционален)" })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  async registerByPhone(
    @Body() dto: RegisterByPhoneDto
  ): Promise<AuthResponseDto> {
    return this.authService.registerByPhone(dto);
  }

  @Post("login/email")
  @ApiOperation({ summary: "Логин по email + пароль" })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async loginByEmail(@Body() dto: LoginByEmailDto): Promise<AuthResponseDto> {
    return this.authService.loginByEmail(dto);
  }

  @Post("login/phone")
  @ApiOperation({ summary: "Логин по телефону + пароль" })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async loginByPhone(@Body() dto: LoginByPhoneDto): Promise<AuthResponseDto> {
    return this.authService.loginByPhone(dto);
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
  @ApiOperation({ summary: "Подтвердить OTP-код по телефону и войти" })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async verifyPhoneOtp(
    @Body() dto: VerifyPhoneOtpDto
  ): Promise<AuthResponseDto> {
    return this.authService.verifyPhoneOtp(dto);
  }

  @Post("login/email/otp/verify")
  @ApiOperation({ summary: "Подтвердить OTP-код по email и войти" })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async verifyEmailOtp(
    @Body() dto: VerifyEmailOtpDto
  ): Promise<AuthResponseDto> {
    return this.authService.verifyEmailOtp(dto);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Текущий пользователь" })
  @ApiResponse({ status: 200, type: UserDto })
  async me(@Req() req: any): Promise<UserDto> {
    // payload из JwtStrategy.validate
    return this.authService.me(req.user);
  }
}
