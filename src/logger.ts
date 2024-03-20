import chalk from "chalk";

export enum LogLevel {
  TRACE,
  DEBUG,
  INFO,
  WARN,
  ERROR,
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class Logger {
  public static setLogLevel(level: LogLevel) {
    CURRENT_LOG_LEVEL = level;
  }

  public static log(level: LogLevel, ...data: unknown[]) {
    if (level < CURRENT_LOG_LEVEL) {
      return;
    }

    const levelInfo = LEVEL_TO_INFO[level];

    const stringifiedData = data.map((x) => {
      if (x instanceof Error) {
        return chalk.red(String(x));
      }

      if (typeof x === "object") {
        return JSON.stringify(x, (_, v: unknown) =>
          typeof v === "bigint" ? v.toString() : v,
        );
      }

      if (typeof x === "string") {
        return x.replaceAll("\n", " ");
      }

      return String(x);
    });

    // eslint-disable-next-line no-console
    console.log(
      `${chalk.gray(`[${new Date().toISOString()}]`)} ${levelInfo.colored(`[${levelInfo.name}]`.padEnd(MAX_NAME_LENGTH + 2))}`,
      ...stringifiedData,
    );
  }

  public static trace(...data: unknown[]) {
    Logger.log(LogLevel.TRACE, ...data);
  }

  public static debug(...data: unknown[]) {
    Logger.log(LogLevel.DEBUG, ...data);
  }

  public static info(...data: unknown[]) {
    Logger.log(LogLevel.INFO, ...data);
  }

  public static warn(...data: unknown[]) {
    Logger.log(LogLevel.WARN, ...data);
  }

  public static error(...data: unknown[]) {
    Logger.log(LogLevel.ERROR, ...data);
  }
}

const LEVEL_TO_INFO = {
  [LogLevel.TRACE]: {
    name: "trce",
    colored: (str: string) => chalk.gray(str),
  },
  [LogLevel.DEBUG]: {
    name: "dbug",
    colored: (str: string) => chalk.blue(str),
  },
  [LogLevel.INFO]: {
    name: "info",
    colored: (str: string) => chalk.green(str),
  },
  [LogLevel.WARN]: {
    name: "warn",
    colored: (str: string) => chalk.yellow(str),
  },
  [LogLevel.ERROR]: {
    name: "err",
    colored: (str: string) => chalk.red(str),
  },
} as const satisfies Record<
  LogLevel,
  {
    name: string;
    colored: (str: string) => string;
  }
>;

const NAME_TO_LEVEL = Object.fromEntries(
  Object.entries(LEVEL_TO_INFO).flatMap(([level, info]) => [
    [info.name.toLowerCase(), Number(level) as unknown as LogLevel],
    [
      LogLevel[Number(level) as LogLevel].toLowerCase(),
      Number(level) as unknown as LogLevel,
    ],
  ]),
) as Record<string, LogLevel>;

const MAX_NAME_LENGTH = Math.max(
  ...Object.values(LEVEL_TO_INFO).map((x) => x.name.length),
);

function getInitialLogLevel(): LogLevel {
  const defaultLevel =
    // eslint-disable-next-line dot-notation, @typescript-eslint/dot-notation
    process.env["NODE_ENV"] === "production" ? LogLevel.INFO : LogLevel.DEBUG;

  // eslint-disable-next-line @typescript-eslint/dot-notation,dot-notation
  const envLevel = process.env["LOG_LEVEL"]?.toLowerCase();

  if (!envLevel) {
    return defaultLevel;
  }

  const level = NAME_TO_LEVEL[envLevel];

  if (level === undefined) {
    throw new Error(`Invalid log level: ${envLevel}`);
  }

  return level;
}

let CURRENT_LOG_LEVEL = getInitialLogLevel();
