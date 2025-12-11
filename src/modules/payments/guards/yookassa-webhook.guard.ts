import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";

@Injectable()
export class YookassaWebhookGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const auth = req.headers["authorization"];

    const shopId = this.configService.get<string>("YOOKASSA_SHOP_ID");
    const secret = this.configService.get<string>("YOOKASSA_SECRET_KEY");

    if (!shopId || !secret) {
      throw new UnauthorizedException("Yookassa credentials not configured");
    }

    const expected = `Basic ${Buffer.from(`${shopId}:${secret}`).toString(
      "base64"
    )}`;

    if (!auth || auth !== expected) {
      throw new UnauthorizedException("Invalid YooKassa webhook signature");
    }

    return true;
  }
}
