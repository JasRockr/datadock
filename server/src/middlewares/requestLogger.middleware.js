/**
 * Middleware para registrar peticiones HTTP
 * Proporciona un log detallado de todas las peticiones entrantes y sus respuestas
 */
import logger from '../utils/logger.js';

/**
 * Middleware que registra detalles de cada petición HTTP
 */
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const { method, originalUrl, ip } = req;
  
  // Registrar la petición entrante
  logger.http(`${method} ${originalUrl}`, { ip, userAgent: req.get('user-agent') });
  
  // Capturar cuando se complete la respuesta
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const { statusCode } = res;
    
    // Determinar el nivel de log según el código de estado
    const level = statusCode >= 500 ? 'error' : 
                  statusCode >= 400 ? 'warn' : 
                  'http';
    
    // Registrar la respuesta con sus detalles
    logger[level](
      `${method} ${originalUrl} ${statusCode} - ${responseTime}ms`,
      { statusCode, responseTime }
    );
  });
  
  next();
};

export default requestLogger;