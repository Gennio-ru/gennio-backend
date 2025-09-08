export interface IPaginationQuery {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface PaginationResult<T> {
  items: T[];
  meta: PaginationMeta;
}
