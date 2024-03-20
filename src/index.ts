import { runDiscordBot } from "./bot";
import { ENV } from "./env";
import { Logger } from "./logger";

async function main() {
  Logger.info("Starting application");
  Logger.debug("Using environment", ENV);

  await runDiscordBot();
}

void main().catch((e: unknown) => {
  Logger.error(e);
  process.exit(1);
});
