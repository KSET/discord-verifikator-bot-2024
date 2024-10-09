import fs from "node:fs/promises";

import { JWT } from "google-auth-library";
import {
  GoogleSpreadsheet,
  type GoogleSpreadsheetRow,
} from "google-spreadsheet";
import { z } from "zod";

import { ENV } from "~/env";
import { Logger } from "~/logger";

/* eslint-disable camelcase */
const CREDENTIALS_FILE_VALIDATION = z.object({
  client_email: z.string().email(),
  private_key: z.string(),
});
/* eslint-enable camelcase */

export class GoogleSheetService {
  private spreadsheet: GoogleSpreadsheet;
  private everybodySheetId: number;
  private everybodySheetCache = {
    rows: [] as GoogleSpreadsheetRow<RawUserRow>[],
    lastUpdated: new Date(0),
  };

  public static async newFromEnv() {
    Logger.info(
      "Initializing Google Sheet service from environment variables",
      ENV,
    );

    const exists = await fs.stat(ENV.GOOGLE_KEY_FILE).catch(() => null);
    if (!exists) {
      throw new Error(
        `Google key file not found at ${ENV.GOOGLE_KEY_FILE}. Make sure to set the GOOGLE_KEY_FILE environment variable.`,
      );
    }

    const fileData = await fs
      .readFile(ENV.GOOGLE_KEY_FILE, "utf-8")
      .catch(() => null);

    if (!fileData) {
      throw new Error(
        `Google key file at ${ENV.GOOGLE_KEY_FILE} is empty or cannot be read. Make sure to set the GOOGLE_KEY_FILE environment variable.`,
      );
    }

    const googleCredentials = CREDENTIALS_FILE_VALIDATION.parse(
      JSON.parse(fileData),
    );

    const jwt = new JWT({
      email: googleCredentials.client_email,
      key: googleCredentials.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      ...(ENV.SPREADSHEET_USER
        ? {
            subject: ENV.SPREADSHEET_USER,
          }
        : {}),
    });

    const spreadsheet = new GoogleSpreadsheet(ENV.SPREADSHEET_ID, jwt);

    Logger.info("Loading Google Sheet info");
    await spreadsheet.loadInfo();
    Logger.info("Loaded Google Sheet info");

    return new this({
      spreadsheet,
      everybodySheetId: ENV.SPREADSHEET_SHEET_ID,
    });
  }

  public get spreadsheetId() {
    return this.spreadsheet.spreadsheetId;
  }

  public async getEverybodySheetRows() {
    if (this.everybodySheetCache.rows.length === 0) {
      await this.updateEverybodySheetCache();
    }

    return this.everybodySheetCache.rows;
  }

  public async updateEverybodySheetCache() {
    try {
      Logger.info("Updating everybody sheet cache");
      const rows = await this.everybodySheet.getRows<RawUserRow>();
      Logger.info("Updated everybody sheet cache:", rows.length, "rows");
      this.everybodySheetCache.rows = rows;
      this.everybodySheetCache.lastUpdated = new Date();
    } catch (e) {
      Logger.error("Error updating everybody sheet cache", e);
    }
  }

  public async findUserByEmail(searchEmail: string) {
    const trim = (x: string | null | undefined) => x?.trim().toLowerCase();
    const get = (row: GoogleSpreadsheetRow<RawUserRow>, x: keyof RawUserRow) =>
      trim(String(row.get(x) ?? ""));

    const email = trim(searchEmail);

    const rows = await this.getEverybodySheetRows();

    return rows
      .find(
        (row) =>
          get(row, "KSET e-pošta") === email ||
          get(row, "Privatna e-pošta") === email,
      )
      ?.toObject();
  }

  public async findUserByOib(searchOib: string) {
    const oib = searchOib.trim();

    const rows = await this.getEverybodySheetRows();

    return rows
      .find((row) => String(row.get("OIB")).trim() === oib)
      ?.toObject();
  }

  private constructor(params: {
    spreadsheet: GoogleSpreadsheet;
    everybodySheetId: number;
  }) {
    this.spreadsheet = params.spreadsheet;
    this.everybodySheetId = params.everybodySheetId;
  }

  private get everybodySheet() {
    const sheetId = this.everybodySheetId;
    const sheets = this.spreadsheet.sheetsById;

    if (!(sheetId in sheets)) {
      throw new Error("Sheet not found");
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return sheets[sheetId]!;
  }
}

export type RawUserRow = {
  "Ime i prezime": string;
  OIB: string | number;
  "Trenutna vrsta članstva": string;
  "Matična sekcija": string;
  "KSET e-pošta": string | null | undefined;
  "Privatna e-pošta": string | null | undefined;
};
