import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { REQUIRE_TOKENS_KEY } from "../decorators/require-tokens.decorator";
import { ErrorCode } from "../errors/error-code.enum";
import { UserRole } from "src/modules/users/types/user-role.enum";

@Injectable()
export class RequireTokensGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<number | undefined>(
      REQUIRE_TOKENS_KEY,
      context.getHandler()
    );

    // Если декоратор не стоит — пропускаем
    if (required === undefined) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;

    // 0️⃣ Админ всегда пропускается
    if (user?.role === UserRole.Admin) return true;

    const tokens = user?.tokens ?? 0;

    // 1️⃣ Если токенов 0 — сразу ошибка
    if (tokens <= 0) {
      throw new BadRequestException({
        handled: true,
        code: ErrorCode.TOKENS_NOT_ENOUGH,
        details: { required: required ?? 1 },
      });
    }

    // 2️⃣ Если required указан — проверяем недостаток
    if (required !== undefined && tokens < required) {
      throw new BadRequestException({
        handled: true,
        code: ErrorCode.TOKENS_NOT_ENOUGH,
        details: { required },
      });
    }

    return true;
  }
}
