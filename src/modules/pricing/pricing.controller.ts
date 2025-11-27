import { Controller, Get } from "@nestjs/common";
import { TOKEN_PACKS } from "./configs/token-packs.config";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { TokenPackDto } from "./dto/token-pack.dto";

@ApiTags("pricing")
@Controller("pricing")
export class PricingController {
  @Get("token-packs")
  @ApiOperation({
    summary: "Получить список доступных пакетов токенов",
    description:
      "Возвращает набор пакетов токенов, которые отображаются пользователю на фронте.",
  })
  @ApiOkResponse({
    type: TokenPackDto,
    isArray: true,
    description: "Массив доступных пакетов токенов",
  })
  getTokenPacks() {
    return Object.values(TOKEN_PACKS);
  }
}
