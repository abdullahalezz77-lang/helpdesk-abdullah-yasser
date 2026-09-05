import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReassignTicketDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-1234-56789abcdef0' })
  @IsUUID('4', { message: 'Assignee must be a valid user UUID' })
  @IsNotEmpty({ message: 'New assignee is required' })
  assigneeId!: string;

  @ApiPropertyOptional({ example: 'Reassigning hardware issue to desktop specialist' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
