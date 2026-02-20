import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

const logger = new Logger('MailService');

type MailerConfig = {
  mailFrom?: string;
  mailPassword?: string;
  mailService: string;
  mailUser?: string;
  verificationBaseUrl: string;
  passwordResetBaseUrl: string;
};

const getMailerConfig = (): MailerConfig => {
  // Trim env values to avoid auth failures caused by invisible whitespace.
  const mailUser = process.env.MAIL_USER?.trim();
  const mailPassword = process.env.MAIL_APP_PASSWORD?.trim();
  const mailFrom = process.env.MAIL_FROM?.trim() ?? mailUser;
  const mailService = process.env.MAIL_SERVICE ?? 'gmail';

  // APP_BASE_URL typically points to the API host.
  const appBaseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3000';

  // Optional overrides allow frontend-hosted pages for auth links.
  const verificationBaseUrl =
    process.env.EMAIL_VERIFY_URL ?? `${appBaseUrl}/auth/verify`;
  const passwordResetBaseUrl =
    process.env.PASSWORD_RESET_URL ?? `${appBaseUrl}/reset-password`;
  return {
    mailFrom,
    mailPassword,
    mailService,
    mailUser,
    verificationBaseUrl,
    passwordResetBaseUrl,
  };
};

const createTransporter = (
  mailService: string,
  mailUser: string,
  mailPassword: string,
) =>
  nodemailer.createTransport({
    service: mailService,
    auth: {
      user: mailUser,
      pass: mailPassword,
    },
  });

const sendEmail = async (
  to: string,
  subject: string,
  html: string,
): Promise<boolean> => {
  const { mailFrom, mailPassword, mailService, mailUser } = getMailerConfig();

  if (!mailUser || !mailPassword) {
    logger.warn(
      'MAIL_USER or MAIL_APP_PASSWORD is missing. Skipping email delivery.',
    );
    return false;
  }

  const transporter = createTransporter(mailService, mailUser, mailPassword);

  try {
    await transporter.sendMail({
      from: mailFrom,
      to,
      subject,
      html,
    });

    return true;
  } catch (error: unknown) {
    logger.error(
      `Failed to send "${subject}" email to ${to}`,
      error instanceof Error ? error.stack : undefined,
    );
    return false;
  }
};

// Sends account verification link with one-time token.
export const sendVerificationEmail = async (
  email: string,
  token: string,
): Promise<boolean> => {
  const { verificationBaseUrl } = getMailerConfig();
  const url = `${verificationBaseUrl}?token=${encodeURIComponent(token)}`;
  return sendEmail(
    email,
    'Verify your email',
    `<h3>Click to verify your email</h3><a href="${url}">${url}</a>`,
  );
};

// Sends password reset link with one-time token.
export const sendResetEmail = async (
  email: string,
  token: string,
): Promise<boolean> => {
  const { passwordResetBaseUrl } = getMailerConfig();
  const url = `${passwordResetBaseUrl}?token=${encodeURIComponent(token)}`;

  return sendEmail(
    email,
    'Reset your password',
    `<h3>Reset your password</h3><a href="${url}">${url}</a>`,
  );
};
