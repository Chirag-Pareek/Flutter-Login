// Minimal Nodemailer typings used by the mail helper in this project.
declare module 'nodemailer' {
  export interface SendMailOptions {
    from?: string;
    to: string;
    subject: string;
    html: string;
  }

  export interface Transporter {
    sendMail(mailOptions: SendMailOptions): Promise<unknown>;
  }

  export interface CreateTransportOptions {
    service?: string;
    auth?: {
      user?: string;
      pass?: string;
    };
  }

  export function createTransport(options: CreateTransportOptions): Transporter;
}
