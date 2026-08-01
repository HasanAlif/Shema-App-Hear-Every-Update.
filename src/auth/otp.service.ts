import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OtpService {
  private readonly SALT_ROUNDS = 10;

  constructor(private readonly configService: ConfigService) {}

  //------------------------- OTP generation----------------------
  generateOtp(): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < 6; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
  }

  // Returns a bcrypt hash of the given OTP — never store the plaintext.
  async hashOtp(otp: string): Promise<string> {
    return await bcrypt.hash(otp, this.SALT_ROUNDS);
  }

  // Compares a plaintext OTP against its stored bcrypt hash.
  async compareOtp(otp: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(otp, hash);
  }

  /**
   * Returns the expiry Date for a freshly generated OTP.
   * Reads OTP_EXPIRES_IN_MINUTES from config (default: 5).
   */
  getExpiryDate(): Date {
    const minutes = this.configService.get<number>('otp.expiresInMinutes') ?? 5;
    return new Date(Date.now() + minutes * 60 * 1000);
  }
}
