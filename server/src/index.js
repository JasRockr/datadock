import app from './app.js';
import './database/connection.js';
import config from './config.js';
import logger from './utils/logger.js';
import { scheduleFileCleanup } from './utils/fileCleanup.js';

// Configurar limpieza automática de archivos si está habilitada
if (config.upload.cleanup.enabled) {
  scheduleFileCleanup();
  logger.info(`Limpieza automática configurada: Retención de ${config.upload.cleanup.retentionDays} días`);
}

app.listen(app.get('port'), () => {
  logger.info(`Servidor iniciado en el puerto: ${app.get('port')}`);
  logger.info(`Entorno: ${config.app.env}`);
  
  if (config.app.isDev) {
    logger.info(`Documentación API: http://${config.server.host}:${config.server.port}/api-docs`);
  }
});
