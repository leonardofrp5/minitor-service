import winston from 'winston';
import config from '../config/index.js';

export const logger = winston.createLogger({
  level: config.ENVIRONMENT !== 'PRODUCTION' ? 'debug' : 'info',
  format: winston.format.combine(winston.format.cli()),
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json(),
      ),
    }),
    new winston.transports.File({
      filename: 'logs/system.log',
      format: winston.format.combine(winston.format.cli()),
    }),
  ],
});

if (config.ENVIRONMENT !== 'PRODUCTION' || config.LOG_IN_CONSOLE === 'true') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
    ),
  }));
}