import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { EventCategory } from '../event.types';

export type EventDocument = HydratedDocument<Event>;

@Schema({ timestamps: true })
export class Event {
  @Prop({
    required: true,
    enum: Object.values(EventCategory),
  })
  category: EventCategory;

  // No default — field is entirely absent when client omits it.
  @Prop({ type: MongooseSchema.Types.Mixed })
  details?: Record<string, any>;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export const EventSchema = SchemaFactory.createForClass(Event);
