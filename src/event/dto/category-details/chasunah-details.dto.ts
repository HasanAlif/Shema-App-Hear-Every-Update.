import { IsLatitude, IsLongitude, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ChasunahDetailsDto {
  @IsOptional()
  @IsString()
  chosonsName?: string;

  @IsOptional()
  @IsString()
  parentInLaw1FullName?: string;

  @IsOptional()
  @IsString()
  parentInLaw1Son?: string;

  @IsOptional()
  @IsString()
  parentInLaw1SonInLaw?: string;

  @IsOptional()
  @IsString()
  parentInLaw2FullName?: string;

  @IsOptional()
  @IsString()
  parentInLaw2Son?: string;

  @IsOptional()
  @IsString()
  parentInLaw2SonInLawOfRabbi?: string;

  @IsOptional()
  @IsString()
  venueName?: string;

  @IsOptional()
  @IsString()
  venueAddress?: string;

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
