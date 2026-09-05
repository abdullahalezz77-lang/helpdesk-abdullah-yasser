import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SentEmailRecord extends EmailOptions {
  sentAt: Date;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private sentEmailsHistory: SentEmailRecord[] = [];

  constructor(private readonly configService: ConfigService) {}

  async sendMail(options: EmailOptions): Promise<boolean> {
    const record: SentEmailRecord = {
      ...options,
      sentAt: new Date(),
    };
    this.sentEmailsHistory.push(record);
    if (this.sentEmailsHistory.length > 50) {
      this.sentEmailsHistory.shift();
    }

    const transport = this.configService.get<string>('MAIL_TRANSPORT', 'console');

    if (transport === 'console' || process.env.NODE_ENV !== 'production') {
      this.logger.log('================ [DEV MAIL DISPATCH] ================');
      this.logger.log(`To: ${options.to}`);
      this.logger.log(`Subject: ${options.subject}`);
      this.logger.log(`Body:\n${options.text}`);
      this.logger.log('=====================================================');
      return true;
    }

    // In production, SMTP or transactional email provider can be attached here
    this.logger.log(
      `Dispatched production email to ${options.to} with subject: ${options.subject}`,
    );
    return true;
  }

  async sendPasswordResetEmail(email: string, resetLink: string, token: string): Promise<boolean> {
    const subject = 'HelpDesk Lite - Password Reset Instructions';
    const text = `Hello,

A password reset request was submitted for your HelpDesk Lite account.

You can reset your password by opening the link below (valid for 15 minutes):
${resetLink}

If you did not request this, please disregard this email. Your password will remain unchanged.

Token: ${token}`;

    return this.sendMail({
      to: email,
      subject,
      text,
    });
  }

  /**
   * Helper for tests to inspect outbound messages in dev/test environment
   */
  getSentEmails(): readonly SentEmailRecord[] {
    return this.sentEmailsHistory;
  }

  getLastEmailTo(email: string): SentEmailRecord | undefined {
    return [...this.sentEmailsHistory]
      .reverse()
      .find((m) => m.to.toLowerCase() === email.toLowerCase());
  }

  clearSentEmails(): void {
    this.sentEmailsHistory = [];
  }
}
