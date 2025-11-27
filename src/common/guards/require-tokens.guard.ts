import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { REQUIRE_TOKENS_KEY } from "../decorators/require-tokens.decorator";
import { ErrorCode } from "../errors/error-code.enum";
import { UserRole } from "src/modules/users/types/user-role.enum";
import { UsersService } from "src/modules/users/users.service";

type JwtUserPayload = {
  sub?: string;
  id?: string;
  userId?: string;
  role?: UserRole;
};

@Injectable()
export class RequireTokensGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.get<number | undefined>(
      REQUIRE_TOKENS_KEY,
      context.getHandler()
    );

    // Если декоратор не стоит — пропускаем
    if (required === undefined) return true;

    const req = context.switchToHttp().getRequest();
    const authUser = req.user as JwtUserPayload | undefined;

    // Поддерживаем разные структуры user'a
    const userId =
      authUser?.sub ?? authUser?.id ?? (authUser as any)?.userId ?? null;

    if (!userId) {
      throw new UnauthorizedException();
    }

    // Берём актуального пользователя из базы
    const dbUser = await this.usersService.findById(userId);
    if (!dbUser) {
      throw new UnauthorizedException();
    }

    // Админ — всегда пропускается
    if (dbUser.role === UserRole.Admin) return true;

    const tokens = dbUser.tokens ?? 0;

    if (tokens <= 0) {
      throw new BadRequestException({
        handled: true,
        code: ErrorCode.TOKENS_NOT_ENOUGH,
        details: { required: required ?? 1, actual: tokens },
      });
    }

    if (required !== undefined && tokens < required) {
      throw new BadRequestException({
        handled: true,
        code: ErrorCode.TOKENS_NOT_ENOUGH,
        details: { required, actual: tokens },
      });
    }

    // На всякий случай: синхронизируем req.user с фактическим балансом
    (req.user as any).tokens = tokens;

    return true;
  }
}
