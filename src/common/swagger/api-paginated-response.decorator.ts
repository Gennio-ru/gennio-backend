import { applyDecorators, Type } from "@nestjs/common";
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from "@nestjs/swagger";
import { PaginationMetaDto } from "../pagination/pagination.dto";

export function ApiPaginatedResponse<TModel extends Type<unknown>>(
  model: TModel,
  opts?: { key?: "items"; description?: string }
) {
  const key = opts?.key ?? "items";
  return applyDecorators(
    ApiExtraModels(PaginationMetaDto, model),
    ApiOkResponse({
      description: opts?.description,
      schema: {
        type: "object",
        properties: {
          [key]: {
            type: "array",
            items: { $ref: getSchemaPath(model) },
          },
          meta: { $ref: getSchemaPath(PaginationMetaDto) },
        },
      },
    })
  );
}
