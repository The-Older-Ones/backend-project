const winston = require("winston");
const config = require("config");
const path = require("path");

const logger = winston.createLogger({
    level: config.loggingLevel,
    format: winston.format.combine(
      winston.format.timestamp({ format: "DD-MM-YYYY HH:mm:ss" }),
      winston.format.printf(info => {
        const { timestamp, level, message} = info;
        return `${timestamp} [${level}] [${message}]`;
      })
    ),
    transports: []
  });

if (config.loggingEnabled) {
  logger.add(
    new winston.transports.File({
      filename: "logs/app.log",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    })
  );
}
if(config.loggingEnabledConsole){
  logger.add(new winston.transports.Console());
}

  module.exports = logger;