import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { EventCategory } from '../event.types';

export class CreateEventDto {
  @IsNotEmpty()
  @IsEnum(EventCategory)
  category: EventCategory;

  @IsNotEmpty()
  @IsString()
  eventTitle: string;

  @IsOptional()
  @IsObject()
  details?: Record<string, any>;
}
