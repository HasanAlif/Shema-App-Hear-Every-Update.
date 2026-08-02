import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { EventModule } from 'src/event/event.module';
import { UserModule } from 'src/user/user.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [EventModule, UserModule, AuthModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
