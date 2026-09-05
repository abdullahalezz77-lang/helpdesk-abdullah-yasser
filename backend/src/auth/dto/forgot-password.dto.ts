import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'employee@helpdesk-lite.local' })
  @IsEmail({}, { message: 'Please enter a valid work email address' })
  @IsNotEmpty({ message: 'Email address is required' })
  email!: string;
}
