import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ICategoryCreate } from "../types/category-mutations.interface";

export class CreateCategoryDto implements ICategoryCreate {
  @ApiProperty({ example: "Мультипликация" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description?: string;
}
