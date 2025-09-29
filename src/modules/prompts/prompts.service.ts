import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Prompt } from "./prompt.entity";
import { FindPromptsDto } from "./dto/find-prompts.dto";
import { CreatePromptDto } from "./dto/create-prompt.dto";
import { PaginationResult } from "src/common/pagination/pagination.interface";
import { paginate } from "src/common/pagination/pagination.util";
import { UpdatePromptDto } from "./dto/update-prompt.dto";

@Injectable()
export class PromptsService {
  constructor(
    @InjectRepository(Prompt)
    private readonly repository: Repository<Prompt>
  ) {}

  async findOne(id: string): Promise<Prompt> {
    const prompt = await this.repository.findOne({
      where: { id },
      relations: ["beforeImage", "afterImage"],
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
          .leftJoinAndSelect("prompt.beforeImage", "beforeFile")
          .leftJoinAndSelect("prompt.afterImage", "afterFile")
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
    const prompt = this.repository.create(data);
    return this.repository.save(prompt);
  }

  async update(id: string, data: UpdatePromptDto): Promise<Prompt> {
    this.repository.update(id, { ...data });

    const prompt = await this.repository.findOne({
      where: { id },
    });

    if (!prompt) {
      throw new Error("Prompt not found");
    }

    return prompt;
  }

  async remove(id: string): Promise<void> {
    const prompt = await this.findOne(id);
    await this.repository.remove(prompt);
  }
}
