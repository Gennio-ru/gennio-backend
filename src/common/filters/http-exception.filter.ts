import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<any>();
    const res = ctx.getResponse<any>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : 500;

    const errorName =
      exception instanceof Error ? exception.name : "UnknownError";
    const errorMessage =
      exception instanceof Error ? exception.message : String(exception);
    const stack = exception instanceof Error ? exception.stack : undefined;

    const payload = {
      msg: "Unhandled exception",
      service: "backend",
      status,
      method: req?.method,
      url: req?.url,
      errorName,
      errorMessage,
      stack,
      requestId: req?.headers["x-request-id"],
    };

    const isServerError = !isHttp || status >= 500;

    if (isServerError) {
      // только 5xx и не-HttpException — настоящие ошибки
      this.logger.error(payload);
    } else {
      // 4xx — ожидаемое поведение, логируем мягче
      this.logger.warn(payload);
    }

    res
      .status(status)
      .json(
        isHttp
          ? exception.getResponse()
          : { statusCode: status, message: "Internal error" }
      );
  }
}
