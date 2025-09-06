import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  ValidateIf,
} from "class-validator";

export class RequestPhoneOtpDto {
  @ApiProperty({ example: "+79998887766" })
  @IsPhoneNumber("RU")
  phone: string;
}
