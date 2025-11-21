import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  NotFoundException,
  ParseUUIDPipe,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { FilesService } from "./files.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { UploadDto } from "./dto/upload.dto";
import { UploadFileResponseDto } from "./dto/upload-file-response.dto";
import { DeleteFileResponseDto } from "./dto/delete-file-response.dto";
import { FileDto } from "./dto/file.dto";
import { UserId } from "src/common/decorators/user-id.decorator";
import { ReqUser } from "src/common/decorators/req-user.decorator";
import { ReqUserData } from "../auth/strategies/jwt-access.strategy";
import { ImageProcessingService } from "src/common/image/image-processing.service";
import { RequireTokens } from "src/common/decorators/require-tokens.decorator";
import { RequireTokensGuard } from "src/common/guards/require-tokens.guard";
import { RolesGuard } from "../users/user-roles.guard";
import { Roles } from "../users/user-roles.decorator";
import { UserRole } from "../users/types/user-role.enum";

@ApiTags("files")
@Controller("files")
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly imageProcessingService: ImageProcessingService
  ) {}

  // Проходит несколько стадий обработки для дальнейшей загрузки в API нейросети
  @Post("ai-upload")
  @RequireTokens(7)
  @UseGuards(JwtAuthGuard, RequireTokensGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new BadRequestException("Unsupported file type"), false);
      },
    })
  )
  @ApiBody({ type: UploadDto })
  @ApiResponse({
    status: 201,
    description: "Файл успешно загружен",
    type: UploadFileResponseDto,
  })
  async aiUpload(
    @UploadedFile() file: Express.Multer.File,
    @UserId() userId: string,
    @Query("folder") folder?: string,
    @Query("public") publicQ?: string
  ): Promise<UploadFileResponseDto> {
    if (!file) throw new BadRequestException("No file");

    // 1) Нормализация под модель: даунскейл + выбор аспекта + crop+resize
    const {
      buffer: normalizedBufferJpeg,
      width,
      height,
      resolvedSize,
    } = await this.imageProcessingService.normalizeForModel(
      file.buffer,
      "auto",
      512
    );

    // 2) Один раз сжать + перевести в WebP
    const normalizedWebpBuffer =
      await this.imageProcessingService.compressToWebp(
        normalizedBufferJpeg,
        150
      );

    // 3) Сохранить уже нормализованный webp
    const saved = await this.filesService.uploadBuffer(
      {
        buffer: normalizedWebpBuffer,
        originalname: file.originalname,
        mimetype: "image/jpeg",
        size: normalizedWebpBuffer.length,
      },
      {
        folder,
        publicRead: publicQ === "true",
        ownerId: userId,
        meta: {
          modelResolvedSize: resolvedSize, // "1024x1536" | ...
        },
      }
    );

    const fileUrl = await this.filesService.getFileUrl(saved);

    return {
      id: saved.id,
      key: saved.key,
      contentType: saved.contentType,
      size: saved.size,
      widthPx: saved.widthPx ?? width,
      heightPx: saved.heightPx ?? height,
      url: fileUrl,
      createdAt: saved.createdAt,
    };
  }

  @Post("upload")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new BadRequestException("Unsupported file type"), false);
      },
    })
  )
  @ApiBody({ type: UploadDto })
  @ApiResponse({
    status: 201,
    description: "Файл успешно загружен",
    type: UploadFileResponseDto,
  })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @UserId() userId: string,
    @Query("folder") folder?: string,
    @Query("public") publicQ?: string
  ): Promise<UploadFileResponseDto> {
    if (!file) throw new BadRequestException("No file");

    // Сжать + перевести в WebP
    const normalizedWebpBuffer =
      await this.imageProcessingService.compressToWebp(file.buffer, 150);

    const { width, height } = await this.imageProcessingService.getDimensions(
      normalizedWebpBuffer
    );

    // Сохранить уже нормализованный webp
    const saved = await this.filesService.uploadBuffer(
      {
        buffer: normalizedWebpBuffer,
        originalname: file.originalname,
        mimetype: "image/jpeg",
        size: normalizedWebpBuffer.length,
      },
      {
        folder,
        publicRead: publicQ === "true",
        ownerId: userId,
      }
    );

    const fileUrl = await this.filesService.getFileUrl(saved);

    return {
      id: saved.id,
      key: saved.key,
      contentType: saved.contentType,
      size: saved.size,
      widthPx: saved.widthPx ?? width,
      heightPx: saved.heightPx ?? height,
      url: fileUrl,
      createdAt: saved.createdAt,
    };
  }

  @Get(":id")
  @ApiOperation({ summary: "Получить метаданные файла" })
  @ApiResponse({ status: 200, type: FileDto })
  @ApiResponse({ status: 404, description: "Файл не найден" })
  async getOne(
    @Param("id", new ParseUUIDPipe({ version: "4" })) fileId: string,
    @Query("signed") signed?: string
  ): Promise<FileDto> {
    const fileMeta = await this.filesService.getMeta(fileId);

    const fileUrl = await this.filesService.getFileUrl(fileMeta);

    return { ...fileMeta, url: fileUrl };
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Удалить файл по ID" })
  @ApiResponse({
    status: 200,
    description: "Файл удалён",
    type: DeleteFileResponseDto,
  })
  @ApiResponse({ status: 404, description: "Файл не найден" })
  async remove(
    @Param("id", new ParseUUIDPipe({ version: "4" })) fileId: string
  ): Promise<DeleteFileResponseDto> {
    return this.filesService.removeById(fileId);
  }
}
