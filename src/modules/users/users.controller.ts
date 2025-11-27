import {
  Controller,
  Get,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Patch,
  Body,
  Query,
  SerializeOptions,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "src/modules/auth/guards/jwt-auth.guard";
import { UserDto } from "./dto/user.dto";
import { Roles } from "./user-roles.decorator";
import { RolesGuard } from "./user-roles.guard";
import { UserRole } from "./types/user-role.enum";
import { BlockUserDto } from "./dto/block-user.dto";
import {
  paginatePlainToInstance,
  plainModelToInstance,
} from "src/common/helpers/entity.helper";
import { ApiPaginatedResponse } from "src/common/swagger/api-paginated-response.decorator";
import { FindUsersDto } from "./dto/find-users.dto";
import { PaginationResult } from "src/common/pagination/pagination.interface";

@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiOperation({
    summary: "Получить список промптов с фильтрами и пагинацией",
  })
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 10 })
  @ApiQuery({ name: "search", required: false, type: String, example: "face" })
  @ApiQuery({
    name: "role",
    required: false,
    enum: UserRole,
    enumName: "UserRole",
  })
  @ApiQuery({ name: "tokensMin", required: false, type: Number })
  @ApiQuery({ name: "tokensMax", required: false, type: Number })
  @ApiPaginatedResponse(UserDto, { key: "items" })
  async findMany(
    @Query() query: FindUsersDto
  ): Promise<PaginationResult<UserDto>> {
    const page = await this.usersService.findMany(query);

    return paginatePlainToInstance(UserDto, page, { groups: [UserRole.Admin] });
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: "Получить пользователя по id" })
  @ApiResponse({
    status: 200,
    description: "Найденный пользователь",
    type: UserDto,
  })
  @ApiResponse({ status: 404, description: "Пользователь не найден" })
  async findOne(@Param("id", ParseUUIDPipe) id: string): Promise<UserDto> {
    const result = await this.usersService.findById(id);

    return plainModelToInstance(UserDto, result, { groups: [UserRole.Admin] });
  }

  @Patch(":id/block")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: "Заблокировать пользователя" })
  @ApiResponse({
    status: 200,
    description: "Пользователь заблокирован",
    type: UserDto,
  })
  @ApiResponse({ status: 404, description: "Пользователь не найден" })
  async blockUser(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: BlockUserDto
  ): Promise<UserDto> {
    const user = await this.usersService.blockUser(id, dto.reason ?? null);

    return plainModelToInstance(UserDto, user, { groups: [UserRole.Admin] });
  }

  @Patch(":id/unblock")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: "Разблокировать пользователя" })
  @ApiResponse({
    status: 200,
    description: "Пользователь разблокирован",
    type: UserDto,
  })
  @ApiResponse({ status: 404, description: "Пользователь не найден" })
  async unblockUser(@Param("id", ParseUUIDPipe) id: string): Promise<UserDto> {
    const user = await this.usersService.unblockUser(id);

    return plainModelToInstance(UserDto, user, { groups: [UserRole.Admin] });
  }
}
