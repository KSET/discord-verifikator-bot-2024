import BetterSqlite3, { type Database } from "better-sqlite3";

import { ENV } from "~/env";
import { Logger } from "~/logger";

import { USER_TABLE_CREATE } from "./models/user";
import { VERIFICATION_ATTEMPT_TABLE_CREATE } from "./models/verification-attempt";

export const DB = createDb();

function createDb() {
  Logger.info("Creating database");
  const db = new BetterSqlite3(ENV.DATABASE_URL, {
    verbose: Logger.trace.bind(null, "[SQL]"),
  });

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("auto_vacuum = INCREMENTAL");

  Logger.info("Database created");

  return db;
}

export function initDb(db: Database = DB) {
  Logger.info("Initializing database");

  const tableCreateStatements = [
    USER_TABLE_CREATE,
    VERIFICATION_ATTEMPT_TABLE_CREATE,
  ];

  for (const statement of tableCreateStatements) {
    Logger.debug("Creating table", statement);
    db.exec(statement);
  }

  Logger.info("Database initialized");
}
