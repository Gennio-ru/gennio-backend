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
  Req,
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
import { UserRole } from "../users/types/user-role.enum";
import { Request } from "express";

@ApiTags("files")
@Controller("files")
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post("upload")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 30 * 1024 * 1024 },
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
    @Req() req: Request,
    @UserId() userId: string,
    @ReqUser() user: ReqUserData,
    @Query("folder") folder?: string,
    @Query("public") publicQ?: string
  ): Promise<UploadFileResponseDto> {
    const contentType = req.headers["content-type"];
    const contentLength = req.headers["content-length"]; // вес всего multipart
    const fileSize = file?.size; // из part-заголовка
    const bufSize = file?.buffer?.length; // реальный размер буфера
    const overhead =
      contentLength && fileSize
        ? Number(contentLength) - Number(fileSize)
        : undefined;

    console.log("[UPLOAD DEBUG]", {
      ua: req.headers["user-agent"],
      contentType,
      contentLength, // байты всего HTTP-запроса
      file: {
        origName: file?.originalname,
        mime: file?.mimetype,
        fileSize, // размер файла по данным Multer
        bufSize, // размер буфера
      },
      overhead, // разница multipart − fileSize
    });

    if (!file) throw new BadRequestException("No file");

    if (user.role === UserRole.User) {
      await this.filesService.clearOldUserFile(userId);
    }

    const compressed = await this.filesService.compressKeepFormat(file.buffer);

    const saved = await this.filesService.uploadBuffer(
      {
        buffer: compressed,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: compressed.length,
      },
      {
        folder,
        publicRead: publicQ === "true",
        ownerId: userId,
      }
    );

    const signedUrl = saved.url
      ? null
      : await this.filesService.getSignedGetUrl(saved.key, 10);
    return {
      id: saved.id,
      key: saved.key,
      url: saved.url ?? signedUrl,
      contentType: saved.contentType,
      size: saved.size,
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
    if (!fileMeta) {
      throw new NotFoundException("File not found");
    }

    const fileUrl =
      signed === "true" || !fileMeta.url
        ? await this.filesService.getSignedGetUrl(fileMeta.key, 3600)
        : fileMeta.url;

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
