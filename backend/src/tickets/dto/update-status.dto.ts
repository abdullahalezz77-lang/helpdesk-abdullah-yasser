import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketStatus } from '@prisma/client';

export class UpdateStatusDto {
  @ApiProperty({ enum: TicketStatus, example: TicketStatus.IN_PROGRESS })
  @IsEnum(TicketStatus, { message: 'Invalid ticket status provided' })
  @IsNotEmpty({ message: 'Target status is required' })
  status!: TicketStatus;

  @ApiPropertyOptional({ example: 'Waiting on user to confirm monitor serial number' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
