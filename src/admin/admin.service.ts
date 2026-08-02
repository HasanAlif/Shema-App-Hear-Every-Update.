import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';

import { Event, EventDocument } from 'src/event/schemas/event.schema';
import { EventStatus } from 'src/event/event.types';
import { User } from 'src/user/schemas/user.schema';
import { MailService } from 'src/auth/mail.service';

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
  ) {}

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
      .sort({ createdAt: -1 })
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
}
