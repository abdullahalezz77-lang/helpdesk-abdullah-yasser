import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('employee')
  @ApiOperation({ summary: 'Get employee dashboard metrics and recent requests' })
  async getEmployeeMetrics(@CurrentUser('id') userId: string) {
    return this.dashboardService.getEmployeeMetrics(userId);
  }

  @Get('support')
  @Roles(Role.SUPPORT, Role.MANAGER)
  @ApiOperation({ summary: 'Get support operations queue metrics and active queue items' })
  async getSupportMetrics(@CurrentUser('id') userId: string) {
    return this.dashboardService.getSupportMetrics(userId);
  }

  @Get('manager')
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Get manager overview, workload distribution, and category breakdowns' })
  async getManagerMetrics() {
    return this.dashboardService.getManagerMetrics();
  }
}
