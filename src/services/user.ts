import type { Database } from "better-sqlite3";
import type { Simplify } from "type-fest";

import { type User, USER_TABLE } from "~/db/models/user";
import { Logger } from "~/logger";

export class UserService {
  private db: Database;

  public static new(params: { db: Database }) {
    Logger.info("Initializing user service from existing database connection");

    return new this(params);
  }

  public createUser(user: Simplify<Omit<User, "id" | "createdAt">>) {
    Logger.debug("Creating user", user);

    this.db
      .prepare(
        `INSERT INTO ${USER_TABLE} (discordId, oib) VALUES ($discordId, $oib)`,
      )
      .run({
        discordId: user.discordId,
        oib: user.oib,
      });
  }

  public getUserByDiscordId(discordId: string) {
    return this.db
      .prepare(`SELECT * FROM ${USER_TABLE} WHERE discordId = $discordId`)
      .get({
        discordId,
      }) as User | null;
  }

  public getOrCreateUser(user: Simplify<Omit<User, "id" | "createdAt">>) {
    const existingUser = this.getUserByDiscordId(user.discordId);

    if (existingUser) {
      return existingUser;
    }

    this.createUser(user);

    return this.getUserByDiscordId(user.discordId)!;
  }

  private constructor(params: { db: Database }) {
    this.db = params.db;
  }
}
