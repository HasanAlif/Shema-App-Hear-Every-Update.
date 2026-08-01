import { IsNotEmpty, IsString } from 'class-validator';

export class ResendOtpDto {
  @IsNotEmpty()
  @IsString()
  email: string;
}
