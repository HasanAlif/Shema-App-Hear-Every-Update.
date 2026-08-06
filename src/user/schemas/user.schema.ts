import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Role } from '../user.types';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  fullName: string;

  @Prop({ unique: true, sparse: true })
  email?: string;

  @Prop()
  password?: string;

  @Prop({ default: Role.User })
  role: Role;

  @Prop()
  otp?: string;

  @Prop()
  otpExpiry?: Date;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  location?: string;

  @Prop()
  phoneNumber?: string;

  @Prop()
  picture?: string;

  @Prop()
  pictureId?: string;

  @Prop()
  address?: string;

  @Prop({ type: [String], default: [] })
  favEvents: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);
