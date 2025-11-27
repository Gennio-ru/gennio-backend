import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy, StrategyOptions } from "passport-jwt";
import { UserRole } from "src/modules/users/types/user-role.enum";
import { ConfigService } from "@nestjs/config";

export interface AccessPayload {
  sub: string;
  role: UserRole;
  tokens: number;
  email: string;
  iat?: number;
  exp?: number;
}

export interface ReqUserData
  extends Pick<AccessPayload, "role" | "tokens" | "email"> {
  userId: string;
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_ACCESS_SECRET") as string,
    });
  }
  validate(payload: AccessPayload): ReqUserData {
    return {
      userId: payload.sub,
      role: payload.role,
      tokens: payload.tokens,
      email: payload.email,
    };
  }
}
