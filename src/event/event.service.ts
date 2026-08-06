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
import { User, UserDocument } from '../user/schemas/user.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { EVENT_CATEGORY_DTO_MAP } from './event-category-dto.map';
import { EventCategory, EventStatus } from './event.types';

@Injectable()
export class EventService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
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
        eventTitle: dto.eventTitle,
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

  async listActiveEvents(category?: string, dateRange?: string) {
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

    if (dateRange && dateRange !== 'all') {
      const validRanges = ['today', 'tomorrow', 'this_week'];
      if (!validRanges.includes(dateRange)) {
        throw new BadRequestException(
          `Invalid dateRange "${dateRange}". Valid values: today, tomorrow, this_week, all`,
        );
      }

      // Helper: format a UTC date as "YYYY-MM-DD" string (matches details.date format)
      const toDateStr = (y: number, m: number, d: number): string => {
        const date = new Date(Date.UTC(y, m, d));
        return date.toISOString().slice(0, 10); // "YYYY-MM-DD"
      };

      const now = new Date();
      const utcYear = now.getUTCFullYear();
      const utcMonth = now.getUTCMonth();
      const utcDate = now.getUTCDate();
      const utcDay = now.getUTCDay(); // 0 = Sunday

      let startStr: string;
      let endStr: string;

      if (dateRange === 'today') {
        startStr = toDateStr(utcYear, utcMonth, utcDate);
        endStr = startStr;
      } else if (dateRange === 'tomorrow') {
        startStr = toDateStr(utcYear, utcMonth, utcDate + 1);
        endStr = startStr;
      } else {
        // this_week: Monday to Sunday of the current UTC week
        const daysFromMonday = utcDay === 0 ? 6 : utcDay - 1;
        startStr = toDateStr(utcYear, utcMonth, utcDate - daysFromMonday);
        endStr = toDateStr(utcYear, utcMonth, utcDate - daysFromMonday + 6);
      }

      // details.date is stored as a "YYYY-MM-DD" string — lexicographic comparison works
      filter['details.date'] = { $gte: startStr, $lte: endStr };
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

    const { createdBy, category, eventTitle, details, ...rest } =
      event.toObject() as Record<string, any>;

    return {
      success: true,
      message: 'Event retrieved successfully',
      data: {
        category,
        eventTitle,
        submittedBy: {
          picture: createdBy?.picture ?? null,
          fullName: createdBy?.fullName ?? null,
          email: createdBy?.email ?? null,
        },
        details,
        ...rest,
      },
    };
  }

  async searchEventsByTitleOrCategory(searchQuery: string): Promise<{
    success: boolean;
    message: string;
    data: unknown[];
  }> {
    if (!searchQuery || !searchQuery.trim()) {
      throw new BadRequestException('searchQuery must not be empty');
    }

    // Escape special regex characters to prevent injection
    const escaped = searchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const events = await this.eventModel
      .aggregate([
        // Step 1: filter only Active events that match either field
        {
          $match: {
            status: EventStatus.ACTIVE,
            $or: [
              { eventTitle: { $regex: escaped, $options: 'i' } },
              { category: { $regex: escaped, $options: 'i' } },
            ],
          },
        },
        // Step 2: compute relevance score
        {
          $addFields: {
            _score: {
              $add: [
                // Exact full-title match → 3 pts
                {
                  $cond: [
                    {
                      $regexMatch: {
                        input: '$eventTitle',
                        regex: `^${escaped}$`,
                        options: 'i',
                      },
                    },
                    3,
                    0,
                  ],
                },
                // Title starts with query → 2 pts
                {
                  $cond: [
                    {
                      $regexMatch: {
                        input: '$eventTitle',
                        regex: `^${escaped}`,
                        options: 'i',
                      },
                    },
                    2,
                    0,
                  ],
                },
                // Title contains query → 1 pt
                {
                  $cond: [
                    {
                      $regexMatch: {
                        input: '$eventTitle',
                        regex: escaped,
                        options: 'i',
                      },
                    },
                    1,
                    0,
                  ],
                },
                // Category matches → 1 pt
                {
                  $cond: [
                    {
                      $regexMatch: {
                        input: '$category',
                        regex: escaped,
                        options: 'i',
                      },
                    },
                    1,
                    0,
                  ],
                },
              ],
            },
          },
        },
        // Step 3: sort by score descending, then by createdAt descending as tiebreaker
        { $sort: { _score: -1, createdAt: -1 } },
        // Step 4: remove the internal score field from output
        { $project: { _score: 0 } },
      ])
      .exec();

    return {
      success: true,
      message: 'Events retrieved successfully',
      data: events,
    };
  }

  async makeEventFav(
    eventId: string,
    userId: string,
    isFavourite: boolean,
  ): Promise<{ success: boolean; message: string }> {
    if (!isValidObjectId(eventId)) {
      throw new BadRequestException('Invalid event ID format');
    }
    if (!isValidObjectId(userId)) {
      throw new BadRequestException('Invalid user ID format');
    }
    const event = await this.eventModel.findById(eventId).exec();
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const alreadyFav = user.favEvents.includes(eventId);

    if (isFavourite) {
      if (alreadyFav) {
        throw new BadRequestException('Event is already in favourites');
      }
      user.favEvents.push(eventId);
      await user.save();
      return {
        success: true,
        message: 'Event added to favourites successfully',
      };
    } else {
      if (!alreadyFav) {
        throw new BadRequestException('Event is not in favourites');
      }
      user.favEvents = user.favEvents.filter(
        (id) => id.toString() !== eventId.toString(),
      );
      await user.save();
      return {
        success: true,
        message: 'Event removed from favourites successfully',
      };
    }
  }
}
