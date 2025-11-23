import { plainToInstance } from "class-transformer";
import {
  ClassConstructor,
  ClassTransformOptions,
} from "class-transformer/types/interfaces";
import { PaginationResult } from "../pagination/pagination.interface";

export function plainModelToInstance<T, V>(
  Model: new () => T,
  plain: V,
  options?: ClassTransformOptions
): T {
  return plainToInstance(Model, plain as any, {
    enableImplicitConversion: true,
    ...options,
  });
}

export const plainModelToInstanceArray = <T, M>(
  PlainClass: ClassConstructor<T>,
  models: M[],
  options?: ClassTransformOptions
): T[] => {
  return models.map((element) =>
    plainModelToInstance(PlainClass, element, options)
  );
};

export const paginatePlainToInstance = <T>(
  PlainClass: ClassConstructor<T>,
  paginate: PaginationResult<any>,
  options?: ClassTransformOptions
): PaginationResult<T> => ({
  meta: paginate.meta,
  items: plainModelToInstanceArray(PlainClass, paginate.items, options),
});
