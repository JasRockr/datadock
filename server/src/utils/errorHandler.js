/**
 * Sistema centralizado de manejo de errores
 * Este módulo proporciona funciones para el manejo uniforme de errores en toda la aplicación
 */
import logger from './logger.js';

// Clase personalizada para errores de la aplicación
export class AppError extends Error {
  constructor(message, statusCode, errorCode = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode || `ERR_${statusCode}`;
    this.details = details;
    this.isOperational = true; // Indica si es un error operacional previsto
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Errores específicos predefinidos
export class FileValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'ERR_FILE_VALIDATION', details);
  }
}

export class FileProcessingError extends AppError {
  constructor(message, details = null) {
    super(message, 500, 'ERR_FILE_PROCESSING', details);
  }
}

export class DatabaseError extends AppError {
  constructor(message, details = null) {
    super(message, 500, 'ERR_DATABASE', details);
  }
}

/**
 * Middleware para manejo centralizado de errores
 */
export const errorMiddleware = (err, req, res, next) => {
  // Usar el sistema de logging para registrar el error
  const errorInfo = {
    statusCode: err.statusCode || 500,
    errorCode: err.errorCode || 'ERR_INTERNAL',
    path: req.originalUrl,
    method: req.method,
    details: err.details || undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  };
  
  // Determinar nivel de log según el código de estado
  if (errorInfo.statusCode >= 500) {
    logger.error(`Error interno: ${err.message}`, errorInfo);
  } else if (errorInfo.statusCode >= 400) {
    logger.warn(`Error de cliente: ${err.message}`, errorInfo);
  } else {
    logger.info(`Error: ${err.message}`, errorInfo);
  }
  
  // Error desconocido
  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || 'ERR_INTERNAL';
  const message = err.isOperational ? err.message : 'Error interno del servidor';
  
  // Formato estandarizado para respuestas de error
  res.status(statusCode).json({
    status: 'error',
    code: errorCode,
    message,
    details: err.details || undefined,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * Manejador de errores asíncronos
 * Permite evitar try/catch repetitivos en controladores async
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Procesa y registra un error antes de lanzarlo
 * @param {Error} error - El error original
 * @param {string} context - Contexto donde ocurrió el error
 * @param {boolean} rethrow - Si debe relanzar el error después de procesarlo
 */
export const handleError = (error, context, rethrow = true) => {
  // Si ya es un AppError, solo registrarlo
  if (error instanceof AppError) {
    logger.warn(`[${context}] ${error.errorCode}: ${error.message}`, error.details || {});
    
    if (rethrow) throw error;
    return error;
  }
  
  // Si es un error de la base de datos o cualquier otro, convertirlo a AppError
  logger.error(`[${context}] Error no manejado: ${error.message}`, { 
    context,
    stack: error.stack 
  });
  
  const appError = new AppError(
    `Error en ${context}: ${error.message}`,
    500,
    `ERR_${context.toUpperCase().replace(/\s+/g, '_')}`,
    { originalError: error.message }
  );
  
  if (rethrow) throw appError;
  return appError;
};