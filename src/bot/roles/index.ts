import type { Client, OAuth2Guild, RoleCreateOptions } from "discord.js";

import { Logger } from "~/logger";
import type { GoogleSheetService } from "~/services/google-sheet";

export const ROLES = {
  Narančasti: {
    color: "#ff8c00",
  },
  Plavi: {
    color: "#1976d2",
  },
} as Record<string, RoleCreateOptions & { id?: string }>;

export type Roles = typeof ROLES;

export async function initRoles(
  client: Client,
  googleSheetService: GoogleSheetService,
) {
  Logger.info("Initializing roles");

  const rows = await googleSheetService.getEverybodySheetRows();
  for (const row of rows) {
    const sekcija = String(row.get("Matična sekcija"));

    if (!sekcija) {
      continue;
    }

    if (sekcija in ROLES) {
      continue;
    }

    ROLES[sekcija] = {
      reason: `${sekcija} sekcija KSET-a`,
    };
  }

  const roles = Object.entries(ROLES).map(([name, options]) => {
    return {
      reason: `${name} članovi KSET-a`,
      ...options,
      name,
    } as RoleCreateOptions;
  });

  Logger.debug("Creating roles", roles);

  Logger.debug("Fetching guilds from API");
  const guilds = await client.guilds.fetch();
  Logger.debug("Fetched guilds", guilds.size);

  const handleGuild = async (oauth2Guild: OAuth2Guild) => {
    Logger.debug(`Handling guild ${oauth2Guild.id} | ${oauth2Guild.name}`);
    const guild = await oauth2Guild.fetch();
    const existingRoles = await guild.roles.fetch();

    for (const role of roles) {
      const existingRole = existingRoles.find((r) => r.name === role.name);
      const roleEntry = ROLES[role.name!];

      if (existingRole) {
        Logger.trace(`Role ${existingRole.name} already exists`, existingRole);
        ROLES[role.name!] = {
          ...roleEntry,
          id: existingRole.id,
          name: existingRole.name,
        };
        continue;
      }

      Logger.debug(`Creating role ${role.name!}`);
      Logger.trace(`Creating role ${role.name!}`, role);
      const newRole = await guild.roles.create(role);
      ROLES[role.name!] = {
        ...roleEntry,
        id: newRole.id,
        name: newRole.name,
      };
    }

    const bot = await guild.members.fetchMe();
    const role = bot.roles.botRole;
    Logger.debug("Setting bot role to be hoisted", role);
    if (role) {
      try {
        await role.setHoist(true, "To force permission assignment to work");
      } catch (e) {
        Logger.error("Error setting bot role to be hoisted", e);
      }
    }

    return true;
  };

  Logger.debug("Resolving promises");
  type MaybeResult<T> = PromiseFulfilledResult<T> | PromiseRejectedResult;
  const resolvedPromises = [] as MaybeResult<
    Awaited<ReturnType<typeof handleGuild>>
  >[];
  for (const oauth2Guild of guilds.values()) {
    try {
      resolvedPromises.push({
        status: "fulfilled",
        value: await handleGuild(oauth2Guild),
      });
    } catch (error) {
      resolvedPromises.push({
        status: "rejected",
        reason: error,
      });
    }
  }
  Logger.debug("Resolved promises");

  Logger.info("Roles initialized", ROLES);

  return resolvedPromises;
}
