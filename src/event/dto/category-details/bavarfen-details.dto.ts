import { IsLatitude, IsLongitude, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class BavarfenDetailsDto {
  @IsOptional()
  @IsString()
  chosonsName?: string;

  @IsOptional()
  @IsString()
  parentInLaw1Name?: string;

  @IsOptional()
  @IsString()
  parentInLaw2Name?: string;

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
  morningPrayerTime?: string;

  @IsOptional()
  @IsString()
  ladiesKiddush?: string;

  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  long?: number;
}
