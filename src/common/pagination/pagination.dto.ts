import { Type } from "class-transformer";
import { IsInt, Min } from "class-validator";
import { IPaginationQuery } from "./pagination.interface";
import { ApiProperty } from "@nestjs/swagger";

export class PaginationQueryDto implements IPaginationQuery {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 10;
}

export class PaginationMetaDto {
  @ApiProperty() totalItems: number;
  @ApiProperty() itemCount: number;
  @ApiProperty() itemsPerPage: number;
  @ApiProperty() totalPages: number;
  @ApiProperty() currentPage: number;
}

export interface PaginationResult<T> {
  items: T[];
  meta: PaginationMetaDto;
}
