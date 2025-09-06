import { ApiProperty } from "@nestjs/swagger";
import { IsPhoneNumber, IsNotEmpty } from "class-validator";

export class LoginByPhoneDto {
  @ApiProperty({ example: "+79998887766" })
  @IsPhoneNumber("RU")
  phone!: string;

  @ApiProperty({ example: "Secret123" })
  @IsNotEmpty()
  password!: string;
}
