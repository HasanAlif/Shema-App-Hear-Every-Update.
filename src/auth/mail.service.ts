import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('mail.host'),
      port: this.configService.get<number>('mail.port'),
      secure: false, // STARTTLS on port 587
      auth: {
        user: this.configService.get<string>('mail.user'),
        pass: this.configService.get<string>('mail.pass'),
      },
    });
  }

  /**
   * Sends a one-time password email to the given address.
   * Throws InternalServerErrorException on delivery failure.
   */
  async sendOtpEmail(to: string, otp: string): Promise<void> {
    const from = this.configService.get<string>('mail.from');
    const expiryMinutes =
      this.configService.get<number>('otp.expiresInMinutes') ?? 5;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #111827; margin-bottom: 8px;">Verify your email</h2>
        <p style="color: #6b7280; margin-bottom: 24px;">
          Use the code below to complete your registration. It expires in
          <strong>${expiryMinutes} minutes</strong>.
        </p>
        <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #111827; text-align: center; padding: 16px; background: #f9fafb; border-radius: 4px;">
          ${otp}
        </div>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
          If you did not request this, please ignore this email.
        </p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: 'Your OTP verification code',
        html,
        text: `Your OTP code is: ${otp}. It expires in ${expiryMinutes} minutes.`,
      });
    } catch (error) {
      const err = error as Error;
      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to send OTP email',
        error: err.message,
      });
    }
  }
}
