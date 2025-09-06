import { ApiProperty } from "@nestjs/swagger";
import { UserDto } from "src/modules/users/dto/user.dto";

export class AuthResponseDto {
  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
  accessToken!: string;

  @ApiProperty({ type: UserDto })
  user!: UserDto;
}
