import { IsEnum, IsNotEmpty, IsObject, IsOptional } from 'class-validator';
import { EventCategory } from '../event.types';

export class CreateEventDto {
  @IsNotEmpty()
  @IsEnum(EventCategory)
  category: EventCategory;

  @IsOptional()
  @IsObject()
  details?: Record<string, any>;
}
