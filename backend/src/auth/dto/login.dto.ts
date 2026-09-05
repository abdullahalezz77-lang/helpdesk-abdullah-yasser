import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'employee@helpdesk-lite.local' })
  @IsEmail({}, { message: 'Please provide a valid work email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;
}
