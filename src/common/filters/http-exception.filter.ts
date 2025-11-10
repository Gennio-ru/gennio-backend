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

    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;

    const errorName =
      exception instanceof Error
        ? exception.name
        : exception instanceof HttpException
        ? exception.name
        : "UnknownError";

    const errorMessage =
      exception instanceof Error || exception instanceof HttpException
        ? exception.message
        : String(exception);

    const stack = exception instanceof Error ? exception.stack : undefined;

    // ВАЖНО: уровень ошибки задаём самим методом .error()
    this.logger.error({
      msg: "Unhandled exception", // по нему будем фильтровать
      service: "backend",
      status,
      method: req?.method,
      url: req?.url,
      errorName,
      errorMessage,
      stack,
      requestId: req?.headers["x-request-id"],
    });

    res.status(status).json({ statusCode: status, message: "Internal error" });
  }
}
