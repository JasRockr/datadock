/**
 * Sistema de logging centralizado
 * Proporciona funciones para registrar mensajes con diferentes niveles de importancia
 * y formatos consistentes.
 */
import fs from 'fs/promises';
import path from 'path';
import config from '../config.js';
import { ensureDirectoryExists } from './fileUtils.js';

// Niveles de log ordenados por importancia
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  trace: 5,
};

// Colores para la consola
const COLORS = {
  reset: '\x1b[0m',
  error: '\x1b[31m', // Rojo
  warn: '\x1b[33m',  // Amarillo
  info: '\x1b[36m',  // Cian
  http: '\x1b[35m',  // Magenta
  debug: '\x1b[32m', // Verde
  trace: '\x1b[90m', // Gris
};

// Configuración del logger
const loggerConfig = {
  level: config.logging?.level || 'info',
  logToFile: config.logging?.logToFile || false,
  logDir: config.logging?.logDir || path.join(process.cwd(), 'logs'),
};

/**
 * Formatea la fecha actual para los logs
 * @returns {string} - Fecha formateada
 */
const getFormattedDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * Escribe un mensaje en el archivo de log
 * @param {string} level - Nivel del mensaje
 * @param {string} message - Mensaje a registrar
 * @returns {Promise<void>}
 */
const writeToFile = async (level, message) => {
  if (!loggerConfig.logToFile) return;
  
  try {
    const today = new Date();
    const logFileName = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}.log`;
    const logFilePath = path.join(loggerConfig.logDir, logFileName);
    
    // Asegurar que el directorio de logs existe
    await ensureDirectoryExists(loggerConfig.logDir);
    
    // Formatear mensaje para archivo
    const timestamp = getFormattedDate();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    
    // Escribir al archivo (modo append)
    await fs.appendFile(logFilePath, logEntry, 'utf8');
  } catch (error) {
    console.error(`Error al escribir en el log: ${error.message}`);
  }
};

/**
 * Registra un mensaje con el nivel especificado
 * @param {string} level - Nivel del mensaje (error, warn, info, http, debug, trace)
 * @param {string} message - Mensaje a registrar
 * @param {Object} [meta] - Metadatos adicionales
 */
const log = (level, message, meta) => {
  // Verificar si el nivel está habilitado
  if (LOG_LEVELS[level] > LOG_LEVELS[loggerConfig.level]) {
    return;
  }
  
  const timestamp = getFormattedDate();
  let consoleMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  // Agregar metadatos si existen
  if (meta && Object.keys(meta).length > 0) {
    const metaString = JSON.stringify(meta, null, 0);
    consoleMessage += ` ${metaString}`;
  }
  
  // Imprimir en consola con color
  console.log(`${COLORS[level]}${consoleMessage}${COLORS.reset}`);
  
  // Escribir a archivo si está habilitado
  writeToFile(level, message + (meta ? ` ${JSON.stringify(meta)}` : ''));
};

// Crear métodos para cada nivel de log
const logger = {
  error: (message, meta) => log('error', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  info: (message, meta) => log('info', message, meta),
  http: (message, meta) => log('http', message, meta),
  debug: (message, meta) => log('debug', message, meta),
  trace: (message, meta) => log('trace', message, meta),
  
  // Método para cambiar la configuración en tiempo de ejecución
  configure: (options) => {
    Object.assign(loggerConfig, options);
  },
};

export default logger;