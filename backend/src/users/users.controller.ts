import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('support-handlers')
  @Roles(Role.SUPPORT, Role.MANAGER)
  @ApiOperation({ summary: 'Get list of active support staff for ticket assignment' })
  async findSupportStaff() {
    return this.usersService.findSupportStaff();
  }
}
