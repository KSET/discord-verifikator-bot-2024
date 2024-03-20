import type { Database } from "better-sqlite3";
import type SMTPPool from "nodemailer/lib/smtp-pool";

import type { User } from "~/db/models/user";
import {
  VERIFICATION_ATTEMPT_TABLE,
  type VertificationAttempt,
} from "~/db/models/verification-attempt";
import { Logger } from "~/logger";

import type { EmailService } from "./email";

export class VerificationService<TEmailService = SMTPPool.SentMessageInfo> {
  private db: Database;
  private emailService: EmailService<TEmailService>;

  public static new<TEmailService>(params: {
    db: Database;
    emailService: EmailService<TEmailService>;
  }) {
    Logger.info(
      "Initializing verification service from existing database connection",
    );

    return new this(params);
  }

  public createVerificationAttemptForUser(params: {
    user: Pick<User, "id">;
    email: string;
  }) {
    Logger.info("Creating verification attempt for user", params);

    const token = this.createToken();

    this.db
      .prepare(
        `INSERT INTO ${VERIFICATION_ATTEMPT_TABLE} (userId, token) VALUES ($userId, $token)`,
      )
      .run({
        userId: params.user.id,
        token,
      });

    return this.emailService.sendEmail({
      to: params.email,
      subject: "Potvrdi svoj email",
      text: `
Bok!

Dobivaš ovaj mail jer je netko zatražio verifikaciju tvog emaila na KSET Discord serveru.

Tvoj token je:
${"=".repeat(token.length)}
${token}
${"=".repeat(token.length)}

Da ga potvrdiš, iskoristi /predaj-kod naredbu na istom serveru na kojem je zatražen.
U slučaju da zahtjev nije došao od tebe, slobodno ignoriraš ovaj email.

Lijep pozdrav,
  KSET Discord bot
`.trim(),
    });
  }

  public verifyToken(params: { user: Pick<User, "id">; token: string }) {
    const result = this.db
      .prepare(
        `SELECT * FROM ${VERIFICATION_ATTEMPT_TABLE} WHERE userId = $userId AND token = $token AND usedAt IS NULL`,
      )
      .get({
        userId: params.user.id,
        token: params.token,
      }) as VertificationAttempt | null;

    if (!result) {
      return null;
    }

    this.db
      .prepare(
        `UPDATE ${VERIFICATION_ATTEMPT_TABLE} SET usedAt = datetime('now') WHERE userId = $userId AND token = $token`,
      )
      .run({
        userId: params.user.id,
        token: params.token,
      });

    return result;
  }

  /**
   * Create a token that will be sent to the user's email.
   *
   * It will be of format `abcdefg-1234567`.
   */
  private createToken() {
    const randomNumber = createRandomString(7, "0123456789");
    const randomString = createRandomString(7, "abcdefghijklmnopqrstuvwxyz");

    return `${randomString}-${randomNumber}` as const;
  }

  private constructor(params: {
    db: Database;
    emailService: EmailService<TEmailService>;
  }) {
    this.db = params.db;
    this.emailService = params.emailService;
  }
}

function createRandomString(length: number, characters: string) {
  const charactersLength = characters.length;

  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}
