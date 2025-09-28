import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { ReqUserData } from "src/modules/auth/strategies/jwt-access.strategy";

export const ReqUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): ReqUserData | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  }
);
