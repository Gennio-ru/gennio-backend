import { Repository, ObjectLiteral } from "typeorm";
import { PaginationQueryDto } from "./pagination.dto";
import { PaginationResult } from "./pagination.interface";

export async function paginate<T extends ObjectLiteral>(
  repository: Repository<T>,
  query: PaginationQueryDto,
  alias = "entity",
  qbCallback?: (qb: ReturnType<Repository<T>["createQueryBuilder"]>) => void
): Promise<PaginationResult<T>> {
  const { page, limit } = query;

  const qb = repository.createQueryBuilder(alias);

  if (qbCallback) {
    qbCallback(qb);
  }

  qb.skip((page - 1) * limit).take(limit);

  const [items, totalItems] = await qb.getManyAndCount();

  return {
    items,
    meta: {
      totalItems,
      itemCount: items.length,
      itemsPerPage: limit,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
    },
  };
}
