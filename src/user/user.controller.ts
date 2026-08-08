import {
  Body,
  Controller,
  Get,
  Patch,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from 'src/auth/auth.guard';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // GET /user/profile — returns the authenticated user's profile with event stats
  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Request() req: any) {
    const userId = req.user.sub as string;
    return this.userService.getUserProfile(userId);
  }

  // GET /user/profileForUpdate — returns the authenticated user's profile for update
  @UseGuards(AuthGuard)
  @Get('profileForUpdate')
  getProfileForUpdate(@Request() req: any) {
    const userId = req.user.sub as string;
    return this.userService.getProfileForUpdate(userId);
  }

  // PATCH /user/profile — update profile fields and/or picture (multipart/form-data)
  @UseGuards(AuthGuard)
  @Patch('profile')
  @UseInterceptors(FileInterceptor('picture', { storage: memoryStorage() }))
  updateProfile(
    @UploadedFile() picture: Express.Multer.File,
    @Body() dto: UpdateProfileDto,
    @Request() req: any,
  ) {
    const userId = req.user.sub as string;
    return this.userService.updateProfile(userId, dto, picture);
  }

  // PATCH /user/change-password — change authenticated user's password
  @UseGuards(AuthGuard)
  @Patch('change-password')
  changePassword(@Body() dto: ChangePasswordDto, @Request() req: any) {
    const userId = req.user.sub as string;
    return this.userService.changePassword(userId, dto);
  }
}
