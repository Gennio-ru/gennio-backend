import {
  Controller,
  Get,
  Param,
  UseGuards,
  ParseUUIDPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "src/modules/auth/guards/jwt-auth.guard";
import { UserDto } from "./dto/user.dto";

@ApiTags("users")
@Controller("users")
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Получить пользователя по id" })
  @ApiResponse({ status: 200, type: UserDto })
  async getOne(@Param("id", ParseUUIDPipe) userId: string): Promise<UserDto> {
    return this.usersService.findById(userId);
  }
}
