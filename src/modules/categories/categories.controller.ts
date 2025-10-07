import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Patch,
  Delete,
  UseGuards,
  HttpCode,
  ParseUUIDPipe,
  Query,
} from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "src/modules/users/user-roles.guard";
import { UserRole } from "src/modules/users/types/user-role.enum";
import { Roles } from "src/modules/users/user-roles.decorator";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { CategoryDto } from "./dto/category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { FindPromptsDto } from "../prompts/dto/find-prompts.dto";

@ApiTags("categories")
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({
    summary: "Получить список категорий",
  })
  @ApiResponse({ status: 200, type: [CategoryDto] })
  async findMany(@Query() query: FindPromptsDto): Promise<CategoryDto[]> {
    return this.categoriesService.findMany(query);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: "Получить один промпт по id" })
  @ApiResponse({
    status: 200,
    description: "Найденная категория",
    type: CategoryDto,
  })
  @ApiResponse({ status: 404, description: "Категория не найдена" })
  async findOne(@Param("id", ParseUUIDPipe) id: string): Promise<CategoryDto> {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: "Создать новую категорию (только админ)" })
  @ApiResponse({
    status: 201,
    description: "Категория создана",
    type: CategoryDto,
  })
  create(@Body() dto: CreateCategoryDto): Promise<CategoryDto> {
    return this.categoriesService.create(dto);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: "Обновить категорию (только админ)" })
  @ApiResponse({
    status: 200,
    description: "Обновлённая категория",
    type: CategoryDto,
  })
  @ApiResponse({ status: 404, description: "Категория не найдена" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto
  ): Promise<CategoryDto> {
    return this.categoriesService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @HttpCode(204)
  @ApiOperation({ summary: "Удалить категорию (только админ)" })
  @ApiResponse({ status: 204, description: "Категория удалёна" })
  @ApiResponse({ status: 404, description: "Категория не найдена" })
  async remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.categoriesService.remove(id);
  }
}
