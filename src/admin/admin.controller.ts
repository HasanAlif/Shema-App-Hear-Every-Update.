import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from 'src/user/user.types';
import { AdminService } from './admin.service';
import { UpdateEventStatusDto } from './dto/update-event-status.dto';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.Admin)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // GET /admin/events?status=all|pending|active|rejected
  @Get('events')
  listEvents(@Query('status') status?: string) {
    return this.adminService.listEvents(status);
  }

  // GET /admin/events/:id
  @Get('events/:id')
  getEventById(@Param('id') id: string) {
    return this.adminService.getEventById(id);
  }

  // PATCH /admin/events/:id/status
  // Body: { "status": "Approve" | "Reject" }
  @Patch('events/:id/status')
  updateEventStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEventStatusDto,
  ) {
    return this.adminService.updateEventStatus(id, dto.status);
  }
}
