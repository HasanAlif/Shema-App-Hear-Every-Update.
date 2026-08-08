import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from 'src/user/user.types';
import { AdminService } from './admin.service';
import { UpdateEventStatusDto } from './dto/update-event-status.dto';
import { UpdateAdminProfileDto } from './dto/update-admin-profile.dto';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.Admin)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // GET /admin/profile
  @Get('profile')
  getAdminProfileInfoForUpdate(@Request() req: any) {
    const userId = req.user.sub as string;
    return this.adminService.getAdminProfileInfoForUpdate(userId);
  }

  // PATCH /admin/profile — update own fullName and/or picture (multipart/form-data)
  @Patch('profile')
  @UseInterceptors(FileInterceptor('picture', { storage: memoryStorage() }))
  updateAdminProfile(
    @UploadedFile() picture: Express.Multer.File,
    @Body() dto: UpdateAdminProfileDto,
    @Request() req: any,
  ) {
    const userId = req.user.sub as string;
    return this.adminService.updateAdminProfileInfo(userId, dto, picture);
  }

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

  // ─── Dashboard analytics ─────────────────────────────────────────────────

  // GET /admin/dashboard/user-growth?year=YYYY
  @Get('dashboard/user-growth')
  getMonthlyUserGrowth(@Query('year') year?: string) {
    return this.adminService.getMonthlyUserGrowth(year);
  }

  // GET /admin/dashboard/events-overview?year=YYYY
  @Get('dashboard/events-overview')
  getEventsOverview(@Query('year') year?: string) {
    return this.adminService.getEventsOverview(year);
  }

  // GET /admin/dashboard/recent-users?limit=10
  @Get('dashboard/recent-users')
  getRecentUsers(@Query('limit') limit?: string) {
    return this.adminService.getRecentUsers(limit);
  }
}
