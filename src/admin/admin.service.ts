import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';

import { Event, EventDocument } from 'src/event/schemas/event.schema';
import { EventStatus } from 'src/event/event.types';
import { User } from 'src/user/schemas/user.schema';
import { MailService } from 'src/auth/mail.service';
import { CloudinaryService } from 'src/utils/cloudinary/cloudinary.service';
import { UpdateAdminProfileDto } from './dto/update-admin-profile.dto';

export type StatusAction = 'Approve' | 'Reject';

function formatEventPublished(raw: any): string {
  if (!raw) return '';
  return new Date(raw as Date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly mailService: MailService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // GET /admin/profile
  async getAdminProfileInfoForUpdate(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('pictureId picture fullName')
      .lean()
      .exec();
    if (!user) {
      throw new NotFoundException('Admin user not found');
    }
    return {
      fullName: user.fullName,
      picture: user.picture,
    };
  }

  // PATCH /admin/profile
  async updateAdminProfileInfo(
    userId: string,
    dto: UpdateAdminProfileDto,
    pictureFile?: Express.Multer.File,
  ): Promise<{
    success: boolean;
    message: string;
    data: Record<string, unknown>;
  }> {
    try {
      // Fetch only the fields we need — minimise document exposure
      const currentUser = await this.userModel
        .findById(userId)
        .select('pictureId picture fullName')
        .lean()
        .exec();

      if (!currentUser) {
        throw new NotFoundException('Admin user not found');
      }

      // Guard: at least one field must be provided
      if (!dto.fullName && !pictureFile) {
        throw new BadRequestException(
          'Provide at least one field to update (fullName or picture)',
        );
      }

      const update: Partial<User> = {};

      if (dto.fullName !== undefined) {
        update.fullName = dto.fullName;
      }

      if (pictureFile) {
        // Upload new image first
        const { url, publicId } = await this.cloudinaryService.uploadImage(
          pictureFile.buffer,
          'admin-profile-pictures',
        );

        // Delete old image after successful upload to avoid orphaned assets
        if (currentUser.pictureId) {
          await this.cloudinaryService.deleteImage(currentUser.pictureId);
        }

        update.picture = url;
        update.pictureId = publicId;
      }

      const updated = await this.userModel
        .findByIdAndUpdate(
          userId,
          { $set: update },
          { returnDocument: 'after' },
        )
        .exec();

      return {
        success: true,
        message: 'Admin profile updated successfully',
        data: {
          fullName: updated?.fullName ?? null,
          picture: updated?.picture ?? null,
        },
      };
    } catch (err) {
      if ((err as { status?: number }).status) throw err;
      throw new InternalServerErrorException(
        (err as Error).message ?? 'Failed to update admin profile',
      );
    }
  }

  // GET /admin/events
  async listEvents(status?: string) {
    const normalised = (status ?? 'all').toLowerCase();
    const allowed = ['all', 'pending', 'active', 'rejected'];
    if (!allowed.includes(normalised)) {
      throw new BadRequestException(
        `Invalid status "${status}". Allowed values: all, pending, active, rejected`,
      );
    }

    const filter: Record<string, any> = {};
    if (normalised !== 'all') {
      const enumMap: Record<string, EventStatus> = {
        pending: EventStatus.PENDING,
        active: EventStatus.ACTIVE,
        rejected: EventStatus.REJECTED,
      };
      filter.status = enumMap[normalised];
    }

    const events: any[] = await this.eventModel
      .find(filter)
      .populate('createdBy')
      .sort({ _id: -1 })
      .exec();

    const data = events.map((event: any) => {
      const user = event.createdBy;
      return {
        id: String(event._id),
        userName: user?.fullName ?? '',
        userEmail: user?.email ?? '',
        userPicture: user?.picture ?? '',
        userPhoneNumber: user?.phoneNumber ?? '',
        userLocation: user?.location ?? '',
        eventPublished: formatEventPublished(event.createdAt),
        eventStatus: event.status,
      };
    });

    return {
      success: true,
      message: 'Events retrieved successfully',
      data,
    };
  }

  // GET /admin/events/:id
  async getEventById(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`Invalid event id: "${id}"`);
    }

    const event: any = await this.eventModel
      .findById(id)
      .populate('createdBy')
      .lean()
      .exec();

    if (!event) {
      throw new BadRequestException(`No event found with id "${id}"`);
    }

    const user = event.createdBy;
    return {
      success: true,
      message: 'Event retrieved successfully',
      data: {
        id: String(event._id),
        category: event.category,
        eventTitle: event.eventTitle,
        status: event.status,
        details: event.details ?? null,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
        eventPublished: formatEventPublished(event.createdAt),
        userName: user?.fullName ?? '',
        userEmail: user?.email ?? '',
        userPicture: user?.picture ?? '',
        userPhoneNumber: user?.phoneNumber ?? '',
        userLocation: user?.location ?? '',
      },
    };
  }

  // PATCH /admin/events/:id/status
  async updateEventStatus(id: string, action: StatusAction) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`Invalid event id: "${id}"`);
    }

    const event = await this.eventModel
      .findById(id)
      .populate('createdBy')
      .exec();

    if (!event) {
      throw new BadRequestException(`No event found with id "${id}"`);
    }

    const previousStatus = event.status;
    const newStatus =
      action === 'Approve' ? EventStatus.ACTIVE : EventStatus.REJECTED;

    event.status = newStatus;
    await event.save();

    if (
      action === 'Approve' &&
      previousStatus !== EventStatus.ACTIVE &&
      newStatus === EventStatus.ACTIVE
    ) {
      const user = event.createdBy as any;
      const userEmail: string | undefined = user?.email;
      const userName: string = user?.fullName ?? 'there';

      void this.mailService.sendEventApprovedEmail(userEmail, {
        userName,
        category: event.category,
        eventId: String(event._id),
      });
    }

    return {
      success: true,
      message: `Event ${action === 'Approve' ? 'approved' : 'rejected'} successfully`,
      data: { id: String(event._id), status: newStatus },
    };
  }

  // ─── Dashboard analytics ──────────────────────────────────────────────────

  private readonly MONTH_LABELS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ] as const;

  /** Build a zeroed 12-month array then fill from aggregate results. */
  private buildMonthlyData(
    results: Array<{ _id: number; count: number }>,
  ): Array<{ month: string; count: number }> {
    const map = new Map<number, number>(results.map((r) => [r._id, r.count]));
    return this.MONTH_LABELS.map((label, i) => ({
      month: label,
      count: map.get(i + 1) ?? 0,
    }));
  }

  /** Validate and parse an optional integer query param. */
  private parseIntParam(
    raw: string | undefined,
    name: string,
    defaultValue: number,
    min: number,
    max?: number,
  ): number {
    if (raw === undefined || raw === '') return defaultValue;
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < min) {
      throw new BadRequestException(
        max !== undefined
          ? `"${name}" must be an integer between ${min} and ${max}`
          : `"${name}" must be an integer >= ${min}`,
      );
    }
    if (max !== undefined && parsed > max) return max;
    return parsed;
  }

  // GET /admin/dashboard/user-growth?year=YYYY
  async getMonthlyUserGrowth(yearStr?: string): Promise<{
    success: boolean;
    message: string;
    data: { year: number; months: Array<{ month: string; count: number }> };
  }> {
    try {
      const year = this.parseIntParam(
        yearStr,
        'year',
        new Date().getFullYear(),
        2000,
        new Date().getFullYear() + 10,
      );

      const results: Array<{ _id: number; count: number }> =
        await this.userModel.aggregate([
          {
            $match: {
              createdAt: {
                $gte: new Date(`${year}-01-01T00:00:00.000Z`),
                $lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
              },
            },
          },
          {
            $group: {
              _id: { $month: '$createdAt' },
              count: { $sum: 1 },
            },
          },
        ]);

      return {
        success: true,
        message: 'Monthly user growth retrieved successfully',
        data: { year, months: this.buildMonthlyData(results) },
      };
    } catch (err) {
      if ((err as { status?: number }).status) throw err;
      throw new InternalServerErrorException(
        (err as Error).message ?? 'Failed to retrieve user growth data',
      );
    }
  }

  // GET /admin/dashboard/events-overview?year=YYYY
  async getEventsOverview(yearStr?: string): Promise<{
    success: boolean;
    message: string;
    data: { year: number; months: Array<{ month: string; count: number }> };
  }> {
    try {
      const year = this.parseIntParam(
        yearStr,
        'year',
        new Date().getFullYear(),
        2000,
        new Date().getFullYear() + 10,
      );

      const results: Array<{ _id: number; count: number }> =
        await this.eventModel.aggregate([
          {
            $match: {
              createdAt: {
                $gte: new Date(`${year}-01-01T00:00:00.000Z`),
                $lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
              },
            },
          },
          {
            $group: {
              _id: { $month: '$createdAt' },
              count: { $sum: 1 },
            },
          },
        ]);

      return {
        success: true,
        message: 'Events overview retrieved successfully',
        data: { year, months: this.buildMonthlyData(results) },
      };
    } catch (err) {
      if ((err as { status?: number }).status) throw err;
      throw new InternalServerErrorException(
        (err as Error).message ?? 'Failed to retrieve events overview data',
      );
    }
  }

  // GET /admin/dashboard/recent-users?limit=10
  async getRecentUsers(limitStr?: string): Promise<{
    success: boolean;
    message: string;
    data: Array<Record<string, unknown>>;
  }> {
    try {
      const limit = this.parseIntParam(limitStr, 'limit', 10, 1, 50);

      const users: any[] = await this.userModel
        .find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
        .exec();

      const data = users.map((user) => ({
        id: String(user._id),
        userName: user.fullName ?? '',
        userEmail: user.email ?? '',
        userPhoneNumber: user.phoneNumber ?? '',
        userLocation: user.location ?? '', // same field as listEvents → userLocation
        userPicture: user.picture ?? '',
        joinedDate: user.createdAt
          ? new Date(user.createdAt as Date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : '',
        status: user.isActive ? 'Active' : 'Suspended',
      }));

      return {
        success: true,
        message: 'Recent users retrieved successfully',
        data,
      };
    } catch (err) {
      if ((err as { status?: number }).status) throw err;
      throw new InternalServerErrorException(
        (err as Error).message ?? 'Failed to retrieve recent users',
      );
    }
  }
}
