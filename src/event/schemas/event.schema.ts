import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { EventCategory, EventStatus } from '../event.types';

export type EventDocument = HydratedDocument<Event>;

@Schema({ timestamps: true })
export class Event {
  @Prop({
    required: true,
    enum: Object.values(EventCategory),
  })
  category: EventCategory;

  @Prop({ type: String, required: true, trim: true })
  eventTitle: string;

  // No default — field is entirely absent when client omits it.
  @Prop({ type: MongooseSchema.Types.Mixed })
  details?: Record<string, any>;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(EventStatus),
    default: EventStatus.PENDING,
  })
  status: EventStatus;
}

export const EventSchema = SchemaFactory.createForClass(Event);
