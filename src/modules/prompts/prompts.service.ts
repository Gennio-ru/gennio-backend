import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Prompt } from "./prompt.entity";
import { FindPromptsDto } from "./dto/find-prompts.dto";
import { CreatePromptDto } from "./dto/create-prompt.dto";
import { PaginationResult } from "src/common/pagination/pagination.interface";
import { paginate } from "src/common/pagination/pagination.util";
import { UpdatePromptDto } from "./dto/update-prompt.dto";
import { FilesService } from "../files/files.service";
import { ImageProcessingService } from "src/common/image/image-processing.service";

@Injectable()
export class PromptsService {
  constructor(
    @InjectRepository(Prompt)
    private readonly repository: Repository<Prompt>,
    private readonly filesService: FilesService,
    private readonly imageProcessingService: ImageProcessingService
  ) {}

  async findOne(id: string): Promise<Prompt> {
    const prompt = await this.repository.findOne({
      where: { id },
      relations: ["afterPreviewImage", "beforePreviewImage"],
    });
    if (!prompt) {
      throw new NotFoundException("Prompt not found");
    }
    return prompt;
  }

  async findMany(query: FindPromptsDto): Promise<PaginationResult<Prompt>> {
    return paginate<Prompt>(
      this.repository,
      query,
      "prompt",
      (queryBuilder) => {
        queryBuilder
          .leftJoinAndSelect("prompt.beforePreviewImage", "beforeFile")
          .leftJoinAndSelect("prompt.afterPreviewImage", "afterFile")
          .leftJoinAndSelect("prompt.category", "category")
          .distinct(true);

        if (query.search) {
          queryBuilder.andWhere(
            "(prompt.title ILIKE :search OR prompt.description ILIKE :search)",
            { search: `%${query.search}%` }
          );
        }

        if (query.categoryId) {
          queryBuilder.andWhere("(prompt.categoryId = :categoryId)", {
            categoryId: query.categoryId,
          });
        }

        queryBuilder.orderBy("prompt.createdAt", "DESC");
      }
    );
  }

  async create(data: CreatePromptDto): Promise<Prompt> {
    const [beforePreviewImageId, afterPreviewImageId] = await Promise.all([
      this.createPreview(data.beforeImageId),
      this.createPreview(data.afterImageId),
    ]);

    const prompt = this.repository.create({
      ...data,
      beforePreviewImageId,
      afterPreviewImageId,
    });

    return this.repository.save(prompt);
  }

  async update(id: string, data: UpdatePromptDto): Promise<Prompt> {
    const existing = await this.repository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Prompt not found");
    }

    let beforePreviewImageId = existing.beforePreviewImageId;
    let afterPreviewImageId = existing.afterPreviewImageId;

    if (data.beforeImageId && data.beforeImageId !== existing.beforeImageId) {
      beforePreviewImageId = await this.createPreview(data.beforeImageId);
    }

    if (data.afterImageId && data.afterImageId !== existing.afterImageId) {
      afterPreviewImageId = await this.createPreview(data.afterImageId);
    }

    await this.repository.update(id, {
      ...data,
      beforePreviewImageId,
      afterPreviewImageId,
    });

    const prompt = await this.repository.findOne({ where: { id } });
    if (!prompt) {
      throw new NotFoundException("Prompt not found");
    }

    return prompt;
  }

  async remove(id: string): Promise<void> {
    const prompt = await this.findOne(id);
    await this.repository.remove(prompt);
  }

  private async createPreview(fileId: string): Promise<string> {
    const originalBuffer = await this.filesService.getFileBufferById(fileId);

    const previewWebp = await this.imageProcessingService.compressToWebp(
      originalBuffer,
      30
    );

    const saved = await this.filesService.uploadBuffer(
      {
        buffer: previewWebp,
        originalname: `${fileId}-preview.webp`,
        mimetype: "image/webp",
        size: previewWebp.length,
      },
      {
        folder: "prompts/previews",
        publicRead: true,
      }
    );

    return saved.id;
  }
}
