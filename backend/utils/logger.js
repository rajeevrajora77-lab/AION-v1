import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// LOGGER CONFIGURATION
// ============================================================================

const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    
    return msg;
  })
);

// JSON format for file output (easier to parse)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// ============================================================================
// TRANSPORTS
// ============================================================================

const transports = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: consoleFormat,
    level: logLevel,
  })
);

// File transports (only in production)
if (process.env.NODE_ENV === 'production') {
  const logsDir = process.env.LOGS_DIR || path.join(__dirname, '../../logs');

  // All logs
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );

  // Error logs only
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      format: fileFormat,
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );
}

// ============================================================================
// CREATE LOGGER
// ============================================================================

const logger = winston.createLogger({
  level: logLevel,
  format: fileFormat,
  transports,
  exitOnError: false,
  silent: process.env.NODE_ENV === 'test',
});

// ============================================================================
// CONVENIENCE METHODS
// ============================================================================

/**
 * Log with context (adds metadata)
 */
logger.logWithContext = (level, message, context = {}) => {
  logger.log(level, message, {
    ...context,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
};

/**
 * Log HTTP request
 */
logger.logRequest = (req) => {
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?._id || 'anonymous',
  });
};

/**
 * Log HTTP response
 */
logger.logResponse = (req, res, duration) => {
  const level = res.statusCode >= 400 ? 'warn' : 'info';
  logger.log(level, 'HTTP Response', {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    userId: req.user?._id || 'anonymous',
  });
};

/**
 * Log authentication events
 */
logger.logAuth = (event, data = {}) => {
  logger.info(`Auth: ${event}`, {
    ...data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Log security events
 */
logger.logSecurity = (event, data = {}) => {
  logger.warn(`Security: ${event}`, {
    ...data,
    timestamp: new Date().toISOString(),
    severity: 'high',
  });
};

/**
 * Log database operations
 */
logger.logDb = (operation, data = {}) => {
  logger.debug(`Database: ${operation}`, {
    ...data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Log API errors
 */
logger.logApiError = (error, context = {}) => {
  logger.error('API Error', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    code: error.code,
    ...context,
  });
};

// ============================================================================
// STARTUP MESSAGE
// ============================================================================

logger.info('=' .repeat(60));
logger.info('🚀 Logger Initialized');
logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
logger.info(`Log Level: ${logLevel}`);
logger.info(`Transports: ${transports.map(t => t.constructor.name).join(', ')}`);
logger.info('=' .repeat(60));

// ============================================================================
// EXPORT
// ============================================================================

export default logger;
