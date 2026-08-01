import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterWithEmailDto } from './dto/registerUser.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verifyOtp.dto';
import { ResendOtpDto } from './dto/resendOtp.dto';
import { AuthGuard } from './auth.guard';
import { UserService } from 'src/user/user.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  //--------------- Registration----------------------
  // POST /auth/register — create user with email, send OTP, no JWT yet
  @Post('register')
  registerWithEmail(@Body() dto: RegisterWithEmailDto) {
    return this.authService.registerWithEmail(dto);
  }

  //--------------- OTP flows---------------------------
  // POST /auth/verify-otp — verify OTP (email or phone), issue JWT on success
  @Post('verify-otp')
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: any,
  ) {
    const result = await this.authService.verifyOtp(dto);
    if (result.success && result.data?.accessToken) {
      res.cookie('accessToken', result.data.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }
    return result;
  }

  // POST /auth/resend-otp — regenerate + resend OTP (email or SMS)
  @Post('resend-otp')
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto);
  }

  //----------------------------Login-----------------------
  // POST /auth/login — email + password login (requires isVerified + isActive)
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: any) {
    const result = await this.authService.login(dto);
    if (result.success && result.data?.accessToken) {
      res.cookie('accessToken', result.data.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }
    return result;
  }

  // POST /auth/logout — clear the auth cookie
  @Post('logout')
  logout(@Res({ passthrough: true }) res: any) {
    res.clearCookie('accessToken');
    return { success: true, message: 'Logged out successfully' };
  }

  //-------------------------Profile----------------------
  // GET /auth/profile — returns the authenticated user's profile
  @UseGuards(AuthGuard)
  @Get('profile')
  async getProfile(@Request() req: any) {
    const userId = req.user.sub as string;
    const user = await this.userService.getUserById(userId);
    return {
      success: true,
      data: {
        id: user?._id,
        fullName: user?.fullName,
        email: user?.email,
        role: user?.role,
      },
    };
  }
}
