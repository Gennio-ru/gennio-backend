import { ApiProperty, IntersectionType } from "@nestjs/swagger";
import { PromptType } from "src/modules/prompts/types/prompt-type.enum";
import { IPrompt, IPromptBase } from "../types/prompt.interface";
import { BaseDto } from "src/common/base/base.dto";
import { Expose, Transform } from "class-transformer";
import { buildPublicUrl } from "src/common/utils/file-url.util";

export class PromptBaseDto implements IPromptBase {
  @ApiProperty({ example: "Аниме-портрет" })
  title!: string;

  @ApiProperty({
    example: "Мягкое освещение, крупный план",
  })
  description!: string;

  @ApiProperty()
  beforeImageId!: string;

  @ApiProperty()
  afterImageId!: string;

  @ApiProperty({ enum: PromptType, enumName: "PromptType" })
  type!: PromptType;

  @ApiProperty({
    description: "Текст промпта",
  })
  text!: string;
}

export class PromptDto
  extends IntersectionType(PromptBaseDto, BaseDto)
  implements IPrompt {}

export class PromptResponseDto extends PromptDto {
  @Expose()
  @Transform(({ obj }) =>
    buildPublicUrl(obj.beforeImage.key, obj.beforeImage.bucket)
  )
  @ApiProperty({ type: String, format: "uri", nullable: true })
  beforeImageUrl!: string | null;

  @Expose()
  @Transform(({ obj }) =>
    buildPublicUrl(obj.afterImage.key, obj.afterImage.bucket)
  )
  @ApiProperty({ type: String, format: "uri", nullable: true })
  afterImageUrl!: string | null;
}
