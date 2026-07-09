import winston from 'winston';

declare module 'winston' {
  interface Logger {
    failed: winston.LeveledLogMethod;
  }
}

const levels = {
  error: 0,
  failed: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  failed: 'magenta',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

winston.addColors(colors);

const defaultLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL ?? defaultLevel,
  format: winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.printf((info) => {
      const tag = info.tag ? `[${info.tag}] ` : '';
      return `Logger [${info.level}] ${tag}${info.message}`;
    }),
  ),
  transports: [new winston.transports.Console()],
});

export default logger;
