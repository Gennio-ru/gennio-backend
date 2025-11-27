import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApiPaginatedResponse } from "src/common/swagger/api-paginated-response.decorator";
import { PaginationResult } from "src/common/pagination/pagination.interface";
import { paginatePlainToInstance } from "src/common/helpers/entity.helper";
import { RolesGuard } from "../users/user-roles.guard";
import { Roles } from "../users/user-roles.decorator";
import { UserRole } from "../users/types/user-role.enum";
import { UserTokenTransactionService } from "./user-token-transactions.service";
import { TokenTransactionReason } from "./types/user-token-transactions.enum";
import { UserTokenTransactionDto } from "./dto/user-token-transactions.dto";
import { FindUserTokenTransactionDto } from "./dto/find-token-transactions.dto";

@ApiTags("transactions")
@ApiBearerAuth()
@Controller("transactions")
export class UserTokenTransactionsController {
  constructor(
    private readonly userTokenTransactionService: UserTokenTransactionService
  ) {}

  // Список транзакций с фильтрами и пагинацией
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiOperation({
    summary: "Получить список платежей с фильтрами и пагинацией",
  })
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 10 })
  @ApiQuery({ name: "delta", required: false, type: Number })
  @ApiQuery({ name: "reason", required: false, enum: TokenTransactionReason })
  @ApiQuery({ name: "createdFrom", required: false, type: String })
  @ApiQuery({ name: "createdTo", required: false, type: String })
  @ApiPaginatedResponse(UserTokenTransactionDto, { key: "items" })
  async findMany(
    @Query() query: FindUserTokenTransactionDto
  ): Promise<PaginationResult<UserTokenTransactionDto>> {
    const page = await this.userTokenTransactionService.findMany(query);

    return paginatePlainToInstance(UserTokenTransactionDto, page);
  }
}
