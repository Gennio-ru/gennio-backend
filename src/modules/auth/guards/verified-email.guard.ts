import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { REQUIRE_VERIFIED_EMAIL_KEY } from "../decorators/require-verified-email.decorator";
import { ErrorCode } from "src/common/errors/error-code.enum";

@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requireVerified = this.reflector.get<boolean>(
      REQUIRE_VERIFIED_EMAIL_KEY,
      context.getHandler()
    );

    if (!requireVerified) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as { isEmailVerified?: boolean };

    if (!user?.isEmailVerified) {
      throw new BadRequestException({
        handled: true,
        code: ErrorCode.EMAIL_NOT_CONFIRMED,
      });
    }

    return true;
  }
}
