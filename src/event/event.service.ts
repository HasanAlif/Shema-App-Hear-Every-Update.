/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { Event, EventDocument } from './schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { EVENT_CATEGORY_DTO_MAP } from './event-category-dto.map';

@Injectable()
export class EventService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
  ) {}

  async createEvent(dto: CreateEventDto, userId: string) {
    try {
      // ── 1. Pick the Details DTO for this category ──────────────────────
      const DetailsDto = EVENT_CATEGORY_DTO_MAP[dto.category];

      // ── 2. Transform the raw details object into the category DTO ───────
      //    Use {} when details was omitted so whitelist still runs and
      //    unknown keys in an empty body are not stored.
      const detailsInstance = plainToInstance(DetailsDto, dto.details ?? {});

      // ── 3. Validate with strict whitelist — unknown keys → 400 ──────────
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

      // ── 4. Build the document payload ───────────────────────────────────
      //    Save the validated instance (whitelisted, typed), not raw input.
      //    Only set `details` when the client actually sent something so the
      //    field stays absent (not {}) when omitted.
      const payload: Record<string, any> = {
        category: dto.category,
        createdBy: userId,
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
      // Re-throw validation errors as-is.
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
}
