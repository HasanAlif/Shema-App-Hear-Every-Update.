import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User } from './schemas/user.schema';
import { Event, EventDocument } from '../event/schemas/event.schema';
import { EventStatus } from '../event/event.types';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
  ) {}

  async createUser(data: Partial<User>) {
    try {
      return await this.userModel.create(data);
    } catch (error) {
      const e = error as { code?: number; message?: string };
      if (e.code === 11000) {
        throw new ConflictException(
          'User already exists with these credentials',
        );
      }
      throw new InternalServerErrorException(
        e.message ?? 'Failed to create user',
      );
    }
  }

  async findByEmail(email: string) {
    return await this.userModel.findOne({ email }).exec();
  }

  async getUserById(id: string) {
    return await this.userModel.findOne({ _id: id }).exec();
  }

  async updateUserById(
    id: string,
    data: Partial<User>,
    unsetFields?: string[],
  ) {
    const update: Record<string, unknown> = { $set: data };
    if (unsetFields && unsetFields.length > 0) {
      const unset: Record<string, number> = {};
      for (const field of unsetFields) {
        unset[field] = 1;
      }
      update.$unset = unset;
    }
    return await this.userModel
      .findByIdAndUpdate(id, update, { returnDocument: 'after' })
      .exec();
  }

  async getUserProfile(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('fullName email picture favEvents')
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [submitted, approved] = await Promise.all([
      this.eventModel.countDocuments({ createdBy: userId }),
      this.eventModel.countDocuments({
        createdBy: userId,
        status: EventStatus.ACTIVE,
      }),
    ]);

    return {
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        fullName: user.fullName,
        email: user.email ?? null,
        picture: user.picture ?? null,
        eventSaved: (user.favEvents ?? []).length,
        submitted,
        approved,
      },
    };
  }
}
