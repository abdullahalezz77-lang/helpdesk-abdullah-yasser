import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPassword123!' })
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword!: string;

  @ApiProperty({ example: 'NewPassword123!' })
  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  newPassword!: string;

  @ApiProperty({ example: 'NewPassword123!' })
  @IsString()
  @IsNotEmpty({ message: 'Password confirmation is required' })
  confirmPassword!: string;
}
