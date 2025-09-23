import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ICategory } from "./types/category.interface";
import { Category } from "./category.entity";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly repository: Repository<Category>
  ) {}

  async findOne(id: string): Promise<Category> {
    const category = await this.repository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException("Category not found");
    }

    return category;
  }

  async findMany(): Promise<Category[]> {
    return this.repository.find();
  }

  async create(data: CreateCategoryDto): Promise<Category> {
    const category = this.repository.create(data);
    return this.repository.save(category);
  }

  async update(id: string, data: UpdateCategoryDto): Promise<Category> {
    this.repository.update(id, { ...data });

    const category = await this.findOne(id);

    return category;
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    await this.repository.remove(category);
  }
}
