import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority } from '@prisma/client';

export class CreateTicketDto {
  @ApiProperty({ example: 'Secondary monitor flickering when connected via HDMI' })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MinLength(5, { message: 'Title must be at least 5 characters long' })
  @MaxLength(150, { message: 'Title cannot exceed 150 characters' })
  title!: string;

  @ApiProperty({ example: 'The Dell external display flickers black every few minutes.' })
  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  @MinLength(10, { message: 'Description must be at least 10 characters long' })
  @MaxLength(5000, { message: 'Description cannot exceed 5000 characters' })
  description!: string;

  @ApiProperty({ example: 'b3f5d1e2-3456-4c78-9012-abcdef123456' })
  @IsUUID('4', { message: 'Valid category ID is required' })
  @IsNotEmpty({ message: 'Category is required' })
  categoryId!: string;

  @ApiPropertyOptional({ enum: TicketPriority, default: TicketPriority.MEDIUM })
  @IsEnum(TicketPriority, { message: 'Priority must be LOW, MEDIUM, HIGH, or URGENT' })
  @IsOptional()
  priority?: TicketPriority;
}
