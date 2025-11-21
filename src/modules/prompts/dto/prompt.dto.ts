import { ApiProperty, IntersectionType, OmitType } from "@nestjs/swagger";
import { PromptType } from "src/modules/prompts/types/prompt-type.enum";
import { IPrompt, IPromptBase } from "../types/prompt.interface";
import { BaseDto } from "src/common/base/base.dto";
import { Expose, Transform, Type } from "class-transformer";
import { buildPublicUrl } from "src/common/utils/file-url.util";
import { CategoryDto } from "src/modules/categories/dto/category.dto";
import { FileDto } from "src/modules/files/dto/file.dto";
import { UserRole } from "src/modules/users/types/user-role.enum";

export class PromptBaseDto implements IPromptBase {
  @Expose()
  @ApiProperty({ example: "Аниме-портрет" })
  title!: string;

  @Expose()
  @ApiProperty({
    example: "Мягкое освещение, крупный план",
  })
  description!: string;

  @Expose()
  @ApiProperty({ type: String })
  beforeImageId!: string | null;

  @Type(() => FileDto)
  @Expose()
  @ApiProperty()
  beforeImage?: FileDto;

  @Expose()
  @ApiProperty()
  afterImageId!: string;

  @Type(() => FileDto)
  @Expose()
  @ApiProperty()
  afterImage!: FileDto;

  @Expose()
  @ApiProperty({ enum: PromptType, enumName: "PromptType" })
  type!: PromptType;

  @Expose({ groups: [UserRole.Admin] })
  @ApiProperty({
    description: "Текст промпта",
  })
  text!: string;

  @Expose()
  @ApiProperty({ type: String })
  categoryId!: string | null;

  @Expose()
  @ApiProperty()
  category?: CategoryDto;
}

export class PromptDto
  extends IntersectionType(PromptBaseDto, BaseDto)
  implements IPrompt {}

export class PromptResponseDto extends PromptDto {
  @Expose()
  @Transform(({ obj }) =>
    buildPublicUrl(obj.beforeImage?.key, obj.beforeImage?.bucket)
  )
  @ApiProperty({ type: String, format: "uri", nullable: true })
  beforeImageUrl!: string | null;

  @Expose()
  @Transform(({ obj }) =>
    buildPublicUrl(obj.afterImage?.key, obj.afterImage?.bucket)
  )
  @ApiProperty({ type: String, format: "uri", nullable: true })
  afterImageUrl!: string | null;
}
