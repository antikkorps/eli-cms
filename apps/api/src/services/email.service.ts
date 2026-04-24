import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { SmtpConfig } from '@eli-cms/shared';
import { SettingsService } from './settings.service.js';
import { AppError } from '../utils/app-error.js';

function buildTransport(smtp: SmtpConfig): Transporter {
  const base = { host: smtp.host, port: smtp.port, secure: smtp.secure };

  switch (smtp.authType) {
    case 'oauth2':
      return nodemailer.createTransport({
        ...base,
        auth: {
          type: 'OAuth2',
          user: smtp.user!,
          clientId: smtp.clientId!,
          clientSecret: smtp.clientSecret!,
          refreshToken: smtp.refreshToken!,
        },
      });
    case 'none':
      return nodemailer.createTransport(base);
    case 'password':
    default:
      return nodemailer.createTransport({
        ...base,
        auth: { user: smtp.user!, pass: smtp.password! },
      });
  }
}

export class EmailService {
  private static async getTransporter(): Promise<{ transporter: Transporter; smtp: SmtpConfig }> {
    const smtp = await SettingsService.getSmtpConfig();
    if (!smtp) {
      throw new AppError(500, 'SMTP is not configured');
    }
    return { transporter: buildTransport(smtp), smtp };
  }

  static async sendPasswordReset(email: string, token: string, frontendUrl: string): Promise<void> {
    const { transporter, smtp } = await this.getTransporter();
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await transporter.sendMail({
      from: `"${smtp.fromName}" <${smtp.fromAddress}>`,
      to: email,
      subject: 'Reset your password — Eli CMS',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a1a2e;">Reset Your Password</h2>
          <p>You requested a password reset for your Eli CMS account.</p>
          <p>Click the button below to set a new password. This link expires in 1 hour.</p>
          <p style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}"
               style="background-color: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Reset Password
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">Eli CMS</p>
        </div>
      `,
    });
  }

  static async sendInvitation(
    email: string,
    token: string,
    frontendUrl: string,
    opts: { inviterName: string; roleName: string; expiresAt: Date },
  ): Promise<void> {
    const { transporter, smtp } = await this.getTransporter();
    const acceptUrl = `${frontendUrl}/accept-invitation?token=${token}`;
    const expiry = opts.expiresAt.toLocaleDateString(undefined, { dateStyle: 'long' });

    await transporter.sendMail({
      from: `"${smtp.fromName}" <${smtp.fromAddress}>`,
      to: email,
      subject: `You're invited to join ${smtp.fromName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a1a2e;">You've been invited</h2>
          <p><strong>${opts.inviterName}</strong> invited you to join Eli CMS as <strong>${opts.roleName}</strong>.</p>
          <p>Click the button below to set your password and activate your account. This invitation expires on ${expiry}.</p>
          <p style="text-align: center; margin: 32px 0;">
            <a href="${acceptUrl}"
               style="background-color: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Accept invitation
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">If you weren't expecting this invitation, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">Eli CMS</p>
        </div>
      `,
    });
  }

  static async sendTestEmail(toAddress: string): Promise<void> {
    const { transporter, smtp } = await this.getTransporter();

    await transporter.sendMail({
      from: `"${smtp.fromName}" <${smtp.fromAddress}>`,
      to: toAddress,
      subject: 'Test email — Eli CMS',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a1a2e;">SMTP Configuration Test</h2>
          <p>If you're reading this, your SMTP settings are working correctly.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">Eli CMS</p>
        </div>
      `,
    });
  }
}
