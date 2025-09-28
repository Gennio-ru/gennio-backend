import { plainToClass } from "class-transformer";
import {
  ClassConstructor,
  ClassTransformOptions,
} from "class-transformer/types/interfaces";
import { PaginationResult } from "../pagination/pagination.interface";

export const plainModelToClass = <T>(
  PlainClass: ClassConstructor<T>,
  model: any,
  options?: ClassTransformOptions
): T =>
  plainToClass(PlainClass, model.toJSON ? model.toJSON() : model, options);

export const plainModelToClassArray = <T, M>(
  PlainClass: ClassConstructor<T>,
  models: M[],
  options?: ClassTransformOptions
): T[] => {
  return models.map((element) =>
    plainModelToClass(PlainClass, element, options)
  );
};

export const paginatePlainToClass = <T>(
  PlainClass: ClassConstructor<T>,
  paginate: PaginationResult<any>,
  options?: ClassTransformOptions
): PaginationResult<T> => ({
  meta: paginate.meta,
  items: plainModelToClassArray(PlainClass, paginate.items, options),
});
