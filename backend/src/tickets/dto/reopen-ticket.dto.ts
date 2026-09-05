import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReopenTicketDto {
  @ApiProperty({ example: 'Issue re-occurred after rebooting machine' })
  @IsString()
  @IsNotEmpty({ message: 'A reason is required to reopen a resolved ticket' })
  @MinLength(5, { message: 'Reason must be at least 5 characters long' })
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
  reason!: string;
}
