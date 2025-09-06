import { ApiProperty } from "@nestjs/swagger";
import { IsPhoneNumber, IsString, Length } from "class-validator";

export class VerifyPhoneOtpDto {
  @ApiProperty({ example: "+79998887766" })
  @IsPhoneNumber("RU")
  phone!: string;

  @ApiProperty({ example: "123456" })
  @IsString()
  @Length(4, 8)
  code!: string;
}
