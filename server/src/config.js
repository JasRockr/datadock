/**
 * Configuración centralizada de la aplicación
 * Proporciona acceso a todas las variables de entorno y configuraciones del sistema
 * con valores predeterminados sensatos para desarrollo y producción.
 */
import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno desde archivo .env
config();

// Determinar el entorno actual
const NODE_ENV = process.env.NODE_ENV || 'development';
const isDev = NODE_ENV === 'development';
const isProd = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test';

// Configuración exportada
export default {
  // Información básica de la aplicación
  app: {
    name: 'DataDock API',
    version: process.env.npm_package_version || '1.0.0',
    env: NODE_ENV,
    isDev,
    isProd,
    isTest,
  },
  
  // Server configuration
  server: {
    host: process.env.HOST || '127.0.0.1',
    port: parseInt(process.env.PORT) || 5128,
    cors: {
      enabled: process.env.CORS_ENABLED !== 'false', // Habilitado por defecto
      origin: process.env.CORS_ORIGIN || '*',
      methods: process.env.CORS_METHODS || 'GET,POST,PUT,DELETE,OPTIONS',
      credentials: process.env.CORS_CREDENTIALS === undefined
        ? true
        : process.env.CORS_CREDENTIALS === 'true',
    },
  },
  
  // Database configuration
  database: {
    // Configuración SQL Server / Azure SQL
    user: process.env.DB_USER || '',
    password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
    server: process.env.DB_SERVER || '',
    database: process.env.DB_NAME || '',
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
      encrypt: process.env.DB_ENCRYPT === undefined
        ? true
        : process.env.DB_ENCRYPT === 'true', // Usar SSL
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERT === undefined
        ? !isProd
        : process.env.DB_TRUST_SERVER_CERT === 'true',
      connectionTimeout: parseInt(process.env.DB_CONN_TIMEOUT || process.env.DB_CONNECTION_TIMEOUT) || 30000, // Timeout de conexión: 30 segundos
      requestTimeout: parseInt(process.env.DB_REQ_TIMEOUT || process.env.DB_REQUEST_TIMEOUT) || 30000, // Timeout de solicitud: 30 segundos
    },
    // Pool de conexiones (mssql lo lee en el nivel superior, no dentro de options)
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 10, // Máximo de conexiones en el pool
      min: parseInt(process.env.DB_POOL_MIN) || 0, // Mínimo de conexiones
      idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE || process.env.DB_POOL_IDLE_TIMEOUT) || 30000, // Tiempo de inactividad
    },
  },

  // Upload configuration
  upload: {
    directory: path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || process.env.UPLOAD_MAX_SIZE) || 10 * 1024 * 1024, // 10MB por defecto
    allowedExtensions: (process.env.ALLOWED_EXTENSIONS || process.env.UPLOAD_ALLOWED_EXTENSIONS || '.csv')
      .split(',')
      .map(ext => ext.trim().startsWith('.') ? ext.trim() : `.${ext.trim()}`),
    // Configuración de limpieza automática de archivos
    cleanup: {
      enabled: process.env.UPLOAD_CLEANUP_ENABLED === 'true' || false,
      retentionDays: parseInt(process.env.UPLOAD_RETENTION_DAYS) || 30, // Mantener archivos por 30 días por defecto
      scheduleIntervalHours: parseInt(process.env.UPLOAD_CLEANUP_INTERVAL) || 24, // Verificar una vez al día
    },
  },
  
  // CSV processing configuration
  csvProcessing: {
    encoding: process.env.CSV_ENCODING || 'utf-8',
    skipEmptyLines: process.env.SKIP_EMPTY_LINES !== 'false', // true por defecto
    headerRowRequired: process.env.CSV_HEADER_REQUIRED !== 'false', // true por defecto
    trimValues: process.env.CSV_TRIM_VALUES !== 'false', // true por defecto
    // Separador forzado. Sin valor, se detecta en la cabecera (con preferencia por ';')
    delimiter: process.env.CSV_DELIMITER || null,
  },
  
  // Tables and schemas
  tables: {
    asesores: process.env.TBL_ASESORES || 'asesores_api',
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'), // En producción: info, en desarrollo: debug
    logToFile: process.env.LOG_TO_FILE === 'true' || isProd, // En producción: guardar a archivo
    logDir: path.join(process.cwd(), process.env.LOG_DIR || 'logs'),
  },
};
