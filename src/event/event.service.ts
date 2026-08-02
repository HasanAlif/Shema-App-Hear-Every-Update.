/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { Event, EventDocument } from './schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { EVENT_CATEGORY_DTO_MAP } from './event-category-dto.map';
import { EventCategory, EventStatus } from './event.types';

@Injectable()
export class EventService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
  ) {}

  async createEvent(dto: CreateEventDto, userId: string) {
    try {
      const DetailsDto = EVENT_CATEGORY_DTO_MAP[dto.category];

      const detailsInstance = plainToInstance(DetailsDto, dto.details ?? {});

      const errors = await validate(detailsInstance, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      if (errors.length > 0) {
        const messages = errors.flatMap((e) =>
          Object.values(e.constraints ?? {}),
        );
        throw new BadRequestException(
          messages.length > 0
            ? messages.join('; ')
            : 'Invalid details for the selected category',
        );
      }

      const payload: Record<string, any> = {
        category: dto.category,
        createdBy: userId,
        status: EventStatus.PENDING,
      };

      if (dto.details !== undefined) {
        payload.details = detailsInstance;
      }

      const saved = await this.eventModel.create(payload);

      return {
        success: true,
        message: 'Event created successfully',
        data: saved,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const err = error as { name?: string; message?: string };

      if (err.name === 'ValidationError') {
        throw new BadRequestException(err.message ?? 'Validation failed');
      }

      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to create event',
        error: err.message,
      });
    }
  }

  async listActiveEvents(category?: string) {
    const filter: Record<string, any> = { status: EventStatus.ACTIVE };

    if (category) {
      const validCategories = Object.values(EventCategory) as string[];
      if (!validCategories.includes(category)) {
        throw new BadRequestException(
          `Invalid category "${category}". Valid values: ${validCategories.join(', ')}`,
        );
      }
      filter.category = category;
    }

    const events = await this.eventModel.find(filter).exec();

    return {
      success: true,
      message: 'Active events retrieved successfully',
      data: events,
    };
  }

  async getSingleEvent(eventId: string): Promise<{
    success: boolean;
    message: string;
    data: Record<string, unknown>;
  }> {
    if (!isValidObjectId(eventId)) {
      throw new BadRequestException('Invalid event ID format');
    }

    const event = await this.eventModel
      .findById(eventId)
      .populate<{
        createdBy: { fullName: string; email?: string; picture?: string };
      }>('createdBy', 'fullName email picture')
      .exec();

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const { createdBy, ...rest } = event.toObject();

    return {
      success: true,
      message: 'Event retrieved successfully',
      data: {
        submittedBy: {
          picture: createdBy?.picture ?? null,
          fullName: createdBy?.fullName ?? null,
          email: createdBy?.email ?? null,
        },
        ...rest,
      },
    };
  }
}
