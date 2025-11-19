import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  BadRequestException,
} from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { ErrorCode } from "../errors/error-code.enum";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<any>();
    const res = ctx.getResponse<any>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : 500;

    let code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR;
    let details: any = undefined;
    let handled = false; // по умолчанию — считаем необработанной

    if (isHttp) {
      const resp = exception.getResponse();

      if (resp && typeof resp === "object") {
        const r: any = resp;
        handled = !!r.handled;
        code =
          r.code ??
          (status === 400
            ? ErrorCode.VALIDATION_FAILED
            : status === 401
            ? ErrorCode.UNAUTHORIZED
            : status === 403
            ? ErrorCode.FORBIDDEN
            : ErrorCode.INTERNAL_SERVER_ERROR);
        details = r.details;

        if (
          status === 400 &&
          exception instanceof BadRequestException &&
          Array.isArray(r.message)
        ) {
          // NestJS validation error → r.message содержит массив ошибок
          details = r.message;
        }
      } else {
        // строковый респонс от стандартных HttpException
        code =
          status === 400
            ? ErrorCode.VALIDATION_FAILED
            : status === 401
            ? ErrorCode.UNAUTHORIZED
            : status === 403
            ? ErrorCode.FORBIDDEN
            : ErrorCode.INTERNAL_SERVER_ERROR;
      }
    }

    const errorName =
      exception instanceof Error ? exception.name : "UnknownError";
    const errorMessage =
      exception instanceof Error ? exception.message : String(exception);
    const stack = exception instanceof Error ? exception.stack : undefined;

    const logPayload = {
      msg: "Unhandled exception",
      service: "backend",
      status,
      method: req?.method,
      url: req?.url,
      errorName,
      errorMessage,
      code,
      handled,
      details,
      stack,
      requestId: req?.headers["x-request-id"],
    };

    // ВАЖНО:
    // - бизнес-ошибки (handled = true) логируем мягко (warn)
    // - всё остальное (необработанное, баги, 5xx) — error -> Loki -> Telegram
    if (handled) {
      this.logger.warn(logPayload);
    } else {
      this.logger.error(logPayload);
    }

    const body = {
      success: false,
      statusCode: status,
      error: {
        code,
        // message даём только для необработанных (общая фраза),
        // фронт для handled сам покажет локализованный текст по code.
        message: handled ? undefined : "Internal server error", // можно заменить на RU, но лучше EN по умолчанию
        details,
      },
      path: req?.url,
      timestamp: new Date().toISOString(),
    };

    res.status(status).json(body);
  }
}
