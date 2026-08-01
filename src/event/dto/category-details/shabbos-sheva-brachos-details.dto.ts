import { IsLatitude, IsLongitude, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ShabbosShevaBrachosDetailsDto {
  @IsOptional()
  @IsString()
  parentInLaw1FullName?: string;

  @IsOptional()
  @IsString()
  parentInLaw2FullName?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  long?: number;
}
