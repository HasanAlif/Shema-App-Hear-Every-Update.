import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class UpdateEventStatusDto {
  @IsNotEmpty()
  @IsString()
  @IsIn(['Approve', 'Reject'], {
    message: 'status must be either "Approve" or "Reject"',
  })
  status: 'Approve' | 'Reject';
}
