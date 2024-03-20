import {
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  DiscordAPIError,
  type LocalizationMap,
  ModalBuilder,
  type ModalSubmitInteraction,
  REST,
  RESTJSONErrorCodes,
  Routes,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import type { Simplify } from "type-fest";

import { ENV } from "~/env";
import { Logger } from "~/logger";
import type { GoogleSheetService } from "~/services/google-sheet";
import type { UserService } from "~/services/user";
import type { VerificationService } from "~/services/verification";

import { ROLES } from "../roles";

export type CommandContext<TInteraction = ChatInputCommandInteraction> = {
  interaction: TInteraction;
  verificationService: VerificationService;
  googleSheetService: GoogleSheetService;
  userService: UserService;
  modalId?: string;
};

export type CommandEntry<TModalId extends string | undefined = undefined> =
  Simplify<
    {
      info: SlashCommandBuilder;
      handleInteraction: (
        context: Readonly<
          Simplify<
            CommandContext & {
              modalId: TModalId;
            }
          >
        >,
      ) => Promise<unknown>;
    } & (
      | {
          modalId: TModalId;
          handleModalSubmit: (
            context: Readonly<
              CommandContext<ModalSubmitInteraction> & {
                modalId: TModalId;
              }
            >,
          ) => Promise<unknown>;
        }
      | object
    )
  >;

const _COMMAND = <const TModalId extends string | undefined = undefined>(
  x: CommandEntry<TModalId>,
) => x;

export const COMMANDS = {
  ping: _COMMAND({
    info: new SlashCommandBuilder().setDescription("Replies with Pong!"),
    handleInteraction: async ({ interaction }) => {
      await interaction.reply({
        content: "Pong!",
        ephemeral: true,
      });
    },
  }),

  "predaj-kod": _COMMAND({
    info: new SlashCommandBuilder().setDescription(
      "Predaj kod koji je poslat na tvoj email",
    ),
    modalId: "codeAfterSubmitModal",
    handleInteraction: async (ctx) => {
      const submitCodeModal = new ModalBuilder()
        .setCustomId(ctx.modalId)
        .setTitle("Predaj kod");

      const codeInput = new TextInputBuilder()
        .setCustomId("codeInput")
        .setLabel("Upiši kod koji ti je poslan na email")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("abcdefg-1234567")
        .setRequired(true);

      submitCodeModal.addComponents([
        new ActionRowBuilder<TextInputBuilder>().addComponents(codeInput),
      ]);

      return ctx.interaction.showModal(submitCodeModal);
    },
    async handleModalSubmit(ctx) {
      const discordUserId = ctx.interaction.user.id;
      const resp = ctx.interaction;

      const token = resp.fields
        .getTextInputValue("codeInput")
        .toLowerCase()
        .trim();

      Logger.debug(`User ${discordUserId} submitted a verification token`);

      await resp.deferReply({
        ephemeral: true,
      });

      const user = ctx.userService.getUserByDiscordId(discordUserId);

      if (!user) {
        Logger.warn(`User ${discordUserId} is not registered`);

        return resp.editReply({
          content:
            "Nisi registriran na serveru. Prvo se pomoću `/prijavi-se` naredbe.",
        });
      }

      const userRow = await ctx.googleSheetService.findUserByOib(user.oib);

      if (!userRow) {
        Logger.error(
          `User ${discordUserId} is registered but not found in the Google Sheet`,
        );

        return resp.editReply({
          content:
            "Tvoj OIB nije pronađen u popisu članova. Javi se svojem šefu za pomoć.",
        });
      }

      const verificationAttempt = ctx.verificationService.verifyToken({
        user,
        token,
      });

      Logger.debug("Got verification result", verificationAttempt);

      if (!verificationAttempt) {
        return resp.editReply({
          content: "Predan kod nije ispravan. Pokušaj ponovno.",
        });
      }

      let discordGuildUser =
        ctx.interaction.guild!.members.cache.get(discordUserId)!;

      const userFullName = userRow["Ime i prezime"];
      Logger.debug("Assigning name to user", { user, userFullName });
      if (userFullName) {
        try {
          discordGuildUser = await discordGuildUser.setNickname(
            userFullName,
            "Actual user's name",
          );
        } catch (e) {
          if (
            e instanceof DiscordAPIError &&
            e.status === Number(RESTJSONErrorCodes.MissingPermissions)
          ) {
            Logger.error(
              `Failed to set nickname for user ${discordUserId}:`,
              "Not enough permissions",
            );
          } else {
            Logger.error(
              `Failed to set nickname for user ${discordUserId}:`,
              e,
            );

            return resp.editReply({
              content:
                "Došlo je do greške prilikom postavljanja imena. Javi se svojem šefu za pomoć.",
            });
          }
        }
      }

      const userRoles = [
        ROLES[userRow["Matična sekcija"]!]?.id,
        ROLES[userRow["Trenutna vrsta članstva"]!.replace(/a$/, "i")]?.id,
      ].filter(Boolean);

      Logger.debug("Assigning roles to user", { user, userRoles });
      {
        try {
          discordGuildUser = await discordGuildUser.roles.add(
            userRoles,
            "Verification successful",
          );
        } catch (e) {
          Logger.error(`Failed to add roles to user ${discordUserId}`, e);
          return resp.editReply({
            content:
              "Došlo je do greške prilikom dodjele uloga. Javi se svojem šefu za pomoć.",
          });
        }
      }

      Logger.info(`User ${discordGuildUser.id} successfully verified`);

      return resp.editReply({
        content: "Kod uspješno predan! Dodijeljene su ti relevantne uloge.",
      });
    },
  }),

  "prijavi-se": _COMMAND({
    info: new SlashCommandBuilder().setDescription("Prijavi se na server"),
    modalId: "registerModal",
    handleInteraction: async (ctx) => {
      const discordUserId = ctx.interaction.user.id;

      Logger.info(`User ${discordUserId} requested to register`);

      const submitEmailModal = new ModalBuilder()
        .setCustomId("registerModal")
        .setTitle("Registriraj se");

      const emailInput = new TextInputBuilder()
        .setCustomId("emailInput")
        .setLabel("Email koji je predan u formi za članove")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("ime.prezime@kset.org / moj-email@gmail.com")
        .setRequired(true);

      submitEmailModal.addComponents([
        new ActionRowBuilder<TextInputBuilder>().addComponents(emailInput),
      ]);

      return ctx.interaction.showModal(submitEmailModal);
    },
    async handleModalSubmit(ctx) {
      const discordUserId = ctx.interaction.user.id;
      const resp = ctx.interaction;
      const email = resp.fields.getTextInputValue("emailInput");

      Logger.debug(
        `User ${discordUserId} submitted the registration form: ${email}`,
      );

      const userRow = await ctx.googleSheetService.findUserByEmail(email);

      Logger.trace("User row", userRow);

      if (!userRow) {
        Logger.info(
          `User ${discordUserId} submitted an unknown email: ${email}`,
        );

        return resp.reply({
          content:
            "Email nije pronađen u popisu članova. Pokušaj ponovno ili se javi svojem šefu za pomoć.",
          ephemeral: true,
        });
      }

      await resp.deferReply({
        ephemeral: true,
      });

      const user = ctx.userService.getOrCreateUser({
        discordId: discordUserId,
        oib: String(userRow.OIB),
      });

      await ctx.verificationService.createVerificationAttemptForUser({
        user,
        email,
      });

      return resp.editReply({
        content:
          "Kod ti je poslan na email. Dobiveni kod predaj pomoću `/predaj-kod` naredbe!",
      });
    },
  }),
} as unknown as Record<string, CommandEntry>;

export type Commands = typeof COMMANDS;
export type Command = Commands[keyof Commands];
export type CommandWithModal = Extract<Command, { modalId: unknown }>;

export const MODAL_ID_TO_COMMAND_NAME = Object.values(COMMANDS).reduce<
  Record<string, CommandWithModal[]>
>((acc, command) => {
  if (!("modalId" in command)) {
    return acc;
  }

  const { modalId } = command;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!modalId) {
    return acc;
  }

  if (!(modalId in acc)) {
    acc[modalId] = [];
  }

  acc[modalId]!.push(command);

  return acc;
}, {});

export type CommandCreateData = {
  name: string;
  name_localizations?: LocalizationMap | null;
  description: string;
  description_localizations?: LocalizationMap | null;
};

export async function initCommands() {
  Logger.info("Initializing application (/) commands");
  const commands = Object.entries(COMMANDS).map(([name, { info }]) => {
    info.setName(name);
    return info;
  });

  const rest = new REST({ version: "10" }).setToken(ENV.DISCORD_BOT_TOKEN);

  try {
    Logger.info("Started refreshing application (/) commands.");
    Logger.debug({
      commands,
    });

    const resp = await rest.put(
      Routes.applicationCommands(ENV.DISCORD_CLIENT_ID),
      {
        body: commands,
      },
    );

    Logger.info("Successfully reloaded application (/) commands.");
    Logger.trace({
      resp,
    });
  } catch (error) {
    Logger.error(error);
  }
}
