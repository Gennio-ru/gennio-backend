import { ApiProperty, IntersectionType } from "@nestjs/swagger";
import { ICategory, ICategoryBase } from "../types/category.interface";
import { BaseDto } from "src/common/base/base.dto";

export class CategoryBaseDto implements ICategoryBase {
  @ApiProperty({ example: "Мультипликация" })
  name!: string;

  @ApiProperty({
    type: String,
    example: "Обработка изображения в рисовке мультфильмов",
  })
  description: string | null;
}

export class CategoryDto
  extends IntersectionType(CategoryBaseDto, BaseDto)
  implements ICategory {}
