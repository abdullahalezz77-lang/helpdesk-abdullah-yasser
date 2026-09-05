import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { ReassignTicketDto } from './dto/reassign-ticket.dto';
import { ReopenTicketDto } from './dto/reopen-ticket.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a new support ticket' })
  @SwaggerResponse({ status: 201, description: 'Ticket created with unique identifier and initial history' })
  async createTicket(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTicketDto,
  ) {
    return this.ticketsService.createTicket(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List tickets according to role permissions with pagination, filters, and search' })
  async findAll(
    @CurrentUser() user: { id: string; role: Role },
    @Query() query: QueryTicketsDto,
  ) {
    return this.ticketsService.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single ticket details with history' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.ticketsService.findOne(id, user);
  }

  @Patch(':id/status')
  @Roles(Role.SUPPORT, Role.MANAGER)
  @ApiOperation({ summary: 'Update ticket status via controlled state machine' })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
    @Body() dto: UpdateStatusDto,
  ) {
    return this.ticketsService.updateStatus(id, user, dto);
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPPORT, Role.MANAGER)
  @ApiOperation({ summary: 'Claim or assign ticket to a support staff member' })
  async assignTicket(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
    @Body() dto: AssignTicketDto,
  ) {
    return this.ticketsService.assignTicket(id, user, dto);
  }

  @Post(':id/reassign')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPPORT, Role.MANAGER)
  @ApiOperation({ summary: 'Reassign ticket to another support staff member' })
  async reassignTicket(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
    @Body() dto: ReassignTicketDto,
  ) {
    return this.ticketsService.reassignTicket(id, user, dto);
  }

  @Post(':id/reopen')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reopen a resolved ticket' })
  async reopenTicket(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
    @Body() dto: ReopenTicketDto,
  ) {
    return this.ticketsService.reopenTicket(id, user, dto);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get complete audit history trail for a ticket' })
  async getHistory(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.ticketsService.getHistory(id, user);
  }
}
