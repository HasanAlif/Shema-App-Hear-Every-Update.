import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UserService } from 'src/user/user.service';
import { OtpService } from './otp.service';
import { MailService } from './mail.service';

import { RegisterWithEmailDto } from './dto/registerUser.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verifyOtp.dto';
import { ResendOtpDto } from './dto/resendOtp.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly mailService: MailService,
  ) {}

  // ------------------Email registration-----------------------
  /**
   * POST /auth/register
   * Creates a user with isVerified=false, sends OTP to email.
   * Does NOT issue a JWT — the client must call /auth/verify-otp first.
   */
  async registerWithEmail(dto: RegisterWithEmailDto) {
    try {
      // Check for existing email before creating to give a clear message
      const existing = await this.userService.findByEmail(dto.email);
      if (existing) {
        if (existing.isVerified) {
          throw new ConflictException('Email is already registered');
        }
      }

      const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

      const otp = this.otpService.generateOtp();
      const hashedOtp = await this.otpService.hashOtp(otp);
      const otpExpiry = this.otpService.getExpiryDate();

      if (existing) {
        // Update unverified user with new details and new OTP
        await this.userService.updateUserById(String(existing._id), {
          fullName: dto.fullName,
          password: hashedPassword,
          otp: hashedOtp,
          otpExpiry,
        });
      } else {
        await this.userService.createUser({
          fullName: dto.fullName,
          email: dto.email,
          password: hashedPassword,
          otp: hashedOtp,
          otpExpiry,
          isVerified: false,
          isActive: true,
        });
      }

      await this.mailService.sendOtpEmail(dto.email, otp);

      return {
        success: true,
        message: 'Please check your email for OTP verification',
        data: { email: dto.email },
      };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      const err = error as Error;
      throw new InternalServerErrorException({
        success: false,
        message: 'Registration failed',
        error: err.message,
      });
    }
  }

  // ------------------OTP verification--------------------
  /**
   * POST /auth/verify-otp
   * Verifies OTP for email or phone. On success, marks isVerified=true,
   * clears OTP fields, and issues a signed JWT.
   */
  async verifyOtp(dto: VerifyOtpDto) {
    try {
      const user = await this.userService.findByEmail(dto.email);
      if (!user) {
        throw new BadRequestException('No account found with this email');
      }

      if (user.isVerified) {
        throw new BadRequestException('Account is already verified');
      }

      if (!user.otp || !user.otpExpiry) {
        throw new BadRequestException(
          'No OTP found. Please request a new one via /auth/resend-otp',
        );
      }

      // Check expiry
      if (new Date() > user.otpExpiry) {
        throw new BadRequestException(
          'OTP has expired. Please request a new one via /auth/resend-otp',
        );
      }

      // Constant-time bcrypt compare
      const isMatch = await this.otpService.compareOtp(dto.otp, user.otp);
      if (!isMatch) {
        throw new BadRequestException('Invalid OTP');
      }

      // Mark verified, clear OTP fields via $unset (undefined in $set is ignored by Mongoose)
      const updatedUser = await this.userService.updateUserById(
        String(user._id),
        { isVerified: true },
        ['otp', 'otpExpiry'],
      );

      const payload = { sub: updatedUser!._id, role: updatedUser!.role };
      const accessToken = await this.jwtService.signAsync(payload);

      return {
        success: true,
        message: 'OTP verified successfully',
        data: {
          accessToken,
          user: {
            id: updatedUser!._id,
            fullName: updatedUser!.fullName,
            email: updatedUser!.email,
            role: updatedUser!.role,
          },
        },
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      const err = error as Error;
      throw new InternalServerErrorException({
        success: false,
        message: 'OTP verification failed',
        error: err.message,
      });
    }
  }

  // ------------------Resend OTP-----------------------
  /**
   * POST /auth/resend-otp
   * Generates a fresh OTP and re-delivers it via the appropriate channel
   */
  async resendOtp(dto: ResendOtpDto) {
    try {
      const user = await this.userService.findByEmail(dto.email);
      if (!user) {
        throw new BadRequestException('No account found with this Email');
      }

      if (user.isVerified) {
        throw new BadRequestException('Account is already verified');
      }

      const otp = this.otpService.generateOtp();
      const hashedOtp = await this.otpService.hashOtp(otp);
      const otpExpiry = this.otpService.getExpiryDate();

      await this.userService.updateUserById(String(user._id), {
        otp: hashedOtp,
        otpExpiry,
      });

      if (user.email && user.email === dto.email) {
        await this.mailService.sendOtpEmail(user.email, otp);
        return {
          success: true,
          message: 'OTP resent to your email',
          data: { email: user.email },
        };
      } else {
        throw new InternalServerErrorException({
          success: false,
          message: 'Unable to deliver OTP to your Email',
        });
      }
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      const err = error as Error;
      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to resend OTP',
        error: err.message,
      });
    }
  }

  // ------------------Login----------------------

  /**
   * POST /auth/login
   * Email + password login. Guards: must be verified AND active.
   */
  async login(loginDto: LoginDto) {
    try {
      const user = await this.userService.findByEmail(loginDto.email);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Verification gate
      if (!user.isVerified) {
        throw new UnauthorizedException('Please verify your account first');
      }

      // Active gate
      if (!user.isActive) {
        throw new UnauthorizedException('Account is inactive');
      }

      // Password check (social-only users have no password)
      if (!user.password) {
        throw new UnauthorizedException(
          'This account uses social sign-in. Please sign in with Google or Apple.',
        );
      }

      const isMatch = await bcrypt.compare(loginDto.password, user.password);
      if (!isMatch) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const payload = { sub: user._id, role: user.role };
      const accessToken = await this.jwtService.signAsync(payload);

      return {
        success: true,
        message: 'Login successful',
        data: {
          accessToken,
          user: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
          },
        },
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      const err = error as Error;
      throw new InternalServerErrorException({
        success: false,
        message: 'Login failed',
        error: err.message,
      });
    }
  }
}
