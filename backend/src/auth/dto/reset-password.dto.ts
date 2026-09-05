import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3' })
  @IsString()
  @IsNotEmpty({ message: 'Reset token is required' })
  token!: string;

  @ApiProperty({ example: 'NewSecret123!' })
  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  newPassword!: string;

  @ApiProperty({ example: 'NewSecret123!' })
  @IsString()
  @IsNotEmpty({ message: 'Password confirmation is required' })
  confirmPassword!: string;
}
