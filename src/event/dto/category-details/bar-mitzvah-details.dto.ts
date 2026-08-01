import { IsLatitude, IsLongitude, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class BarMitzvahDetailsDto {
  @IsOptional()
  @IsString()
  boysName?: string;

  @IsOptional()
  @IsString()
  fathersName?: string;

  @IsOptional()
  @IsString()
  son?: string;

  @IsOptional()
  @IsString()
  sonInLawOfRabbi?: string;

  @IsOptional()
  @IsString()
  synagogueVenue?: string;

  @IsOptional()
  @IsString()
  venueAddress?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  serviceTime?: string;

  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  long?: number;
}
