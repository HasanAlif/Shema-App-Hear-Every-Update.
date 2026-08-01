import { IsLatitude, IsLongitude, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ShidduchDetailsDto {
  @IsOptional()
  @IsString()
  chosonsName?: string;

  @IsOptional()
  @IsString()
  groomFathersName?: string;

  @IsOptional()
  @IsString()
  groomSon?: string;

  @IsOptional()
  @IsString()
  groomSonInLaw?: string;

  @IsOptional()
  @IsString()
  bridesName?: string;

  @IsOptional()
  @IsString()
  brideFathersName?: string;

  @IsOptional()
  @IsString()
  brideSonOfRabbi?: string;

  @IsOptional()
  @IsString()
  brideSonInLawOfRabbi?: string;

  @IsOptional()
  @IsString()
  matchmakerName?: string;

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
