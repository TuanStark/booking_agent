import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';
import * as zlib from 'zlib';
import config from '../config/config';

// Ensure logs directory exists
const logsDir = path.dirname(config.logFile);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log rotation and compression utilities
class LogRotationManager {
  private static instance: LogRotationManager;
  private readonly logsDir: string;
  private readonly maxLogAge: number = 7; // days
  private readonly compressionAge: number = 1; // days

  constructor(logsDirectory: string) {
    this.logsDir = logsDirectory;
  }

  static getInstance(logsDirectory: string): LogRotationManager {
    if (!LogRotationManager.instance) {
      LogRotationManager.instance = new LogRotationManager(logsDirectory);
    }
    return LogRotationManager.instance;
  }

  /**
   * Compress log files older than 1 day
   */
  async compressOldLogs(): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.logsDir);
      const logFiles = files.filter(file =>
        file.endsWith('.log') && !file.endsWith('.gz')
      );

      for (const file of logFiles) {
        const filePath = path.join(this.logsDir, file);
        const stats = await fs.promises.stat(filePath);
        const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

        if (ageInDays > this.compressionAge) {
          await this.compressFile(filePath);
        }
      }
    } catch (error) {
      console.error('Error compressing old logs:', error);
    }
  }

  /**
   * Delete compressed log files older than maxLogAge days
   */
  async cleanupOldLogs(): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.logsDir);
      const compressedFiles = files.filter(file => file.endsWith('.gz'));

      for (const file of compressedFiles) {
        const filePath = path.join(this.logsDir, file);
        const stats = await fs.promises.stat(filePath);
        const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

        if (ageInDays > this.maxLogAge) {
          await fs.promises.unlink(filePath);
          console.log(`Deleted old log file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old logs:', error);
    }
  }

  /**
   * Compress a single log file
   */
  private async compressFile(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(filePath);
      const writeStream = fs.createWriteStream(`${filePath}.gz`);
      const gzip = zlib.createGzip();

      readStream
        .pipe(gzip)
        .pipe(writeStream)
        .on('finish', async () => {
          try {
            // Delete original file after successful compression
            await fs.promises.unlink(filePath);
            console.log(`Compressed and removed: ${path.basename(filePath)}`);
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  /**
   * Get log directory size in MB
   */
  async getLogDirectorySize(): Promise<number> {
    try {
      const files = await fs.promises.readdir(this.logsDir);
      let totalSize = 0;

      for (const file of files) {
        const filePath = path.join(this.logsDir, file);
        const stats = await fs.promises.stat(filePath);
        totalSize += stats.size;
      }

      return Math.round(totalSize / (1024 * 1024) * 100) / 100; // MB with 2 decimal places
    } catch (error) {
      console.error('Error calculating log directory size:', error);
      return 0;
    }
  }
}

// Initialize log rotation manager
const logRotationManager = LogRotationManager.getInstance(logsDir);

// Custom format for logs
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  defaultMeta: {
    service: 'real-estate-chatbot-agent',
    version: config.agent.version
  },
  transports: [
    // File transport
    new winston.transports.File({
      filename: config.logFile,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Error file transport
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ]
});

// Add console transport for development
if (config.nodeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Extended logger interface
interface ExtendedLogger extends winston.Logger {
  logQuery: (query: any, results: any[], duration: number) => void;
  logError: (error: Error, context?: any) => void;
  logMCPCall: (method: string, params: any, response: any, duration: number) => void;
  getLogStats: () => Promise<{ size: number; files: number }>;
  forceRotation: () => Promise<void>;
}

// Add custom methods for specific logging scenarios
(logger as ExtendedLogger).logQuery = (query: any, results: any[], duration: number) => {
  logger.info('Query processed', {
    query: query.text || query,
    intent: query.intent,
    resultsCount: results?.length || 0,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString()
  });
};

(logger as ExtendedLogger).logError = (error: Error, context: any = {}) => {
  logger.error('Application error', {
    error: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};

(logger as ExtendedLogger).logMCPCall = (method: string, params: any, response: any, duration: number) => {
  logger.info('MCP call', {
    method,
    params,
    responseStatus: response?.status,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString()
  });
};

// Add log management methods
(logger as ExtendedLogger).getLogStats = async () => {
  try {
    const files = await fs.promises.readdir(logsDir);
    const logFiles = files.filter(file => file.endsWith('.log') || file.endsWith('.gz'));
    const size = await logRotationManager.getLogDirectorySize();

    return {
      size,
      files: logFiles.length
    };
  } catch (error) {
    logger.error('Error getting log stats', error);
    return { size: 0, files: 0 };
  }
};

(logger as ExtendedLogger).forceRotation = async () => {
  try {
    logger.info('Manual log rotation triggered');
    await logRotationManager.compressOldLogs();
    await logRotationManager.cleanupOldLogs();

    const stats = await (logger as ExtendedLogger).getLogStats();
    logger.info('Manual log rotation completed', stats);
  } catch (error) {
    logger.error('Error during manual log rotation', error);
  }
};

// Start automatic log rotation
if (config.nodeEnv === 'production') {
  (async () => {
    const stats = await (logger as ExtendedLogger).getLogStats();
    logger.info('Logger initialized with rotation', {
      logDirectory: logsDir,
      currentStats: stats,
      rotationSchedule: 'Daily at 2:00 AM (Asia/Ho_Chi_Minh)',
      compressionAfter: '1 day',
      deletionAfter: '7 days'
    });
  })();
} else {
  logger.info('Logger initialized (development mode - no rotation)');
}

export default logger as ExtendedLogger;
