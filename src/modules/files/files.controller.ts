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
  ParseUUIDPipe,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { FilesService } from "./files.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { UploadDto } from "./dto/upload.dto";
import { DeleteFileResponseDto } from "./dto/delete-file-response.dto";
import { FileDto } from "./dto/file.dto";
import { UserId } from "src/common/decorators/user-id.decorator";
import { ImageProcessingService } from "src/common/image/image-processing.service";
import { RolesGuard } from "../users/user-roles.guard";
import { Roles } from "../users/user-roles.decorator";
import { UserRole } from "../users/types/user-role.enum";
import { plainModelToInstance } from "src/common/helpers/entity.helper";
import { randomUUID } from "crypto";

@ApiTags("files")
@Controller("files")
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly imageProcessingService: ImageProcessingService
  ) {}

  // Проходит несколько стадий обработки для дальнейшей загрузки в API нейросети
  @Post("ai-upload")
  @UseGuards(JwtAuthGuard)
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
    type: FileDto,
  })
  async aiUpload(
    @UploadedFile() file: Express.Multer.File,
    @UserId() userId: string,
    @Query("folder") folder?: string,
    @Query("public") publicQ?: string
  ): Promise<FileDto> {
    if (!file) throw new BadRequestException("No file");

    // 1) Нормализация под модель: даунскейл + выбор аспекта + crop+resize
    const { buffer: normalizedBufferJpeg, resolvedSize } =
      await this.imageProcessingService.normalizeForModel(
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
        originalname: `${randomUUID()}.webp`,
        mimetype: "image/webp",
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

    return plainModelToInstance(FileDto, { ...saved, url: fileUrl });
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
    type: FileDto,
  })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @UserId() userId: string,
    @Query("folder") folder?: string,
    @Query("public") publicQ?: string
  ): Promise<FileDto> {
    if (!file) throw new BadRequestException("No file");

    // Сжать + перевести в WebP
    const normalizedWebpBuffer =
      await this.imageProcessingService.compressToWebp(file.buffer, 150);

    // Сохранить уже нормализованный webp
    const saved = await this.filesService.uploadBuffer(
      {
        buffer: normalizedWebpBuffer,
        originalname: `${randomUUID()}.webp`,
        mimetype: "image/webp",
        size: normalizedWebpBuffer.length,
      },
      {
        folder,
        publicRead: publicQ === "true",
        ownerId: userId,
      }
    );

    const fileUrl = await this.filesService.getFileUrl(saved);

    return plainModelToInstance(FileDto, { ...saved, url: fileUrl });
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
