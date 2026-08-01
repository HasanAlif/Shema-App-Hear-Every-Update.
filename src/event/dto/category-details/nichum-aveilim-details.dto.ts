import { IsLatitude, IsLongitude, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class NichumAveilimDetailsDto {
  @IsOptional()
  @IsString()
  nameOfDeceased?: string;

  @IsOptional()
  @IsString()
  relationToDeceased?: string;

  @IsOptional()
  @IsString()
  namesOfMourners?: string;

  @IsOptional()
  @IsString()
  shivaAddress?: string;

  @IsOptional()
  @IsString()
  sittingUntil?: string;

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
