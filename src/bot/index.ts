import { Client, Events, GatewayIntentBits } from "discord.js";

import { DB, initDb } from "~/db";
import { ENV } from "~/env";
import { Logger } from "~/logger";
import { EmailService } from "~/services/email";
import { GoogleSheetService } from "~/services/google-sheet";
import { UserService } from "~/services/user";
import { VerificationService } from "~/services/verification";

import { COMMANDS, initCommands, MODAL_ID_TO_COMMAND_NAME } from "./commands";
import { initRoles, updateUserRoles } from "./roles";

export async function runDiscordBot() {
  initDb();

  await initCommands();

  const googleSheetService = await GoogleSheetService.newFromEnv();
  setInterval(
    () => {
      void googleSheetService
        .updateEverybodySheetCache()
        .then(() => {
          void updateUserRoles(client, googleSheetService, userService);
        })
        .catch();
    },
    10 * 60 * 1000,
  );

  const emailService = EmailService.newFromEnv();
  const userService = UserService.new({
    db: DB,
  });
  const verificationService = VerificationService.new({
    db: DB,
    emailService,
  });

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      // GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildModeration,
    ],
  });

  client.on(Events.ClientReady, () => {
    Logger.info(`Logged in as ${client.user!.tag}!`);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    Logger.trace("Received interaction", interaction);

    if (interaction.isModalSubmit()) {
      const commands = MODAL_ID_TO_COMMAND_NAME[interaction.customId] ?? [];

      for (const command of commands) {
        try {
          await command.handleModalSubmit({
            interaction,
            googleSheetService,
            userService,
            verificationService,
            modalId: command.modalId,
          });
        } catch (e) {
          Logger.error("Error handling modal submit", command.modalId, e);

          if (interaction.replied) {
            await interaction
              .followUp({
                content:
                  "Nešto je puklo prilikom izvođenja naredbe. Molimo pokušajte ponovo.",
                ephemeral: true,
              })
              .catch((e: unknown) => {
                Logger.error(
                  "Error following up on command",
                  command.modalId,
                  e,
                );
              });
          } else {
            await interaction
              .reply({
                content:
                  "Nešto je puklo prilikom izvođenja naredbe. Molimo pokušajte ponovo.",
                ephemeral: true,
              })
              .catch((e: unknown) => {
                Logger.error("Error replying to command", command.modalId, e);
              });
          }
        }
      }
    }

    if (interaction.isChatInputCommand()) {
      Logger.debug("Received command", interaction.commandName);

      const { commandName } = interaction;
      const command = COMMANDS[commandName] as
        | (typeof COMMANDS)[keyof typeof COMMANDS]
        | undefined;

      if (command) {
        Logger.debug("Handling command", commandName);
        try {
          await command.handleInteraction({
            interaction,
            googleSheetService,
            userService,
            verificationService,
            modalId: "modalId" in command ? command.modalId : undefined,
          });
        } catch (e) {
          Logger.error("Error handling command", commandName, e);

          if (interaction.replied) {
            await interaction
              .followUp({
                content:
                  "Nešto je puklo prilikom izvođenja naredbe. Molimo pokušajte ponovo.",
                ephemeral: true,
              })
              .catch((e: unknown) => {
                Logger.error("Error following up on command", commandName, e);
              });
          } else {
            await interaction
              .reply({
                content:
                  "Nešto je puklo prilikom izvođenja naredbe. Molimo pokušajte ponovo.",
                ephemeral: true,
              })
              .catch((e: unknown) => {
                Logger.error("Error replying to command", commandName, e);
              });
          }
        }
      } else {
        Logger.warn("Unknown command", commandName);
      }
    }
  });

  client.on(Events.GuildCreate, async (guild) => {
    Logger.info("Joined guild", guild.name);

    await initRoles(client, googleSheetService);
  });

  Logger.info("Logging in to Discord API");
  const apiToken = await client.login(ENV.DISCORD_BOT_TOKEN);
  Logger.info("Logged in to Discord API", apiToken);

  await initRoles(client, googleSheetService);
  await updateUserRoles(client, googleSheetService, userService);
  setInterval(
    () => {
      void initRoles(client, googleSheetService);
    },
    24 * 60 * 60 * 1000,
  );

  Logger.info("Bot is ready");
}
