import NodeMailer from "nodemailer";
import type SMTPPool from "nodemailer/lib/smtp-pool";
import type { Simplify } from "type-fest";

import { ENV } from "~/env";
import { Logger } from "~/logger";

const TRUEISH = new Set(["true", "1", "t", "y", "yes"]);

export class EmailService<T = SMTPPool.SentMessageInfo> {
  private transporter: NodeMailer.Transporter<T>;

  public static newFromEnv() {
    Logger.info("Initializing email service from environment variables", ENV);

    const transporter = NodeMailer.createTransport({
      pool: true,
      host: ENV.SMTP_HOST,
      port: ENV.SMTP_PORT,
      secure: TRUEISH.has(ENV.SMTP_SECURE),
      auth: {
        user: ENV.SMTP_USER,
        pass: ENV.SMTP_PASS,
      },
    });

    return new this({
      transporter,
    });
  }

  public async sendEmail(info: SendMailOptions) {
    Logger.info("Sending email", {
      to: info.to,
      subject: info.subject,
    });

    const from = ENV.FROM_NAME
      ? `${ENV.FROM_NAME} <${ENV.FROM_EMAIL}>`
      : ENV.FROM_EMAIL;

    return this.transporter.sendMail({
      from,
      ...info,
    });
  }

  private constructor(params: { transporter: NodeMailer.Transporter<T> }) {
    this.transporter = params.transporter;
  }
}

export type SendMailOptions = Simplify<
  {
    to: string;
    subject: string;
  } & (
    | {
        text: string;
        html?: string;
      }
    | {
        text?: string;
        html: string;
      }
  )
>;
