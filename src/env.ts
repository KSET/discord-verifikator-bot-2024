import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({
  override: typeof Bun !== "undefined",
});

const envValidation = z.object({
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number().int().gte(1).lte(65535),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((x) => x?.trim().toLowerCase() ?? "false"),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  FROM_EMAIL: z.string().email(),
  FROM_NAME: z.string().optional(),

  SPREADSHEET_USER: z.string().optional(),
  SPREADSHEET_ID: z.string(),
  SPREADSHEET_SHEET_ID: z.coerce.number().int().gte(0),

  DISCORD_BOT_TOKEN: z.string(),
  DISCORD_CLIENT_ID: z.string(),

  GOOGLE_KEY_FILE: z.string(),

  DATABASE_URL: z.string(),
});

export const ENV = envValidation.parse(process.env);
