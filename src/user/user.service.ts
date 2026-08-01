import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User } from './schemas/user.schema';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

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
}
