import { IsLatitude, IsLongitude, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class BrisDetailsDto {
  @IsOptional()
  @IsString()
  fathersName?: string;

  @IsOptional()
  @IsString()
  son?: string;

  @IsOptional()
  @IsString()
  sonInLaw?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  whoseHouse?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  long?: number;
}
