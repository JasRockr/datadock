/**
 * Utilidad para la limpieza automática de archivos subidos
 * Elimina archivos más antiguos que un período de retención configurable
 */
import fs from 'fs';
import path from 'path';
import config from '../config.js';
import logger from './logger.js';

/**
 * Elimina archivos más antiguos que el período de retención configurado
 * @param {string} directory - Directorio a limpiar
 * @returns {Promise<number>} - Número de archivos eliminados
 */
export const cleanupOldFiles = async (directory = config.upload.directory) => {
  try {
    if (!config.upload.cleanup.enabled) {
      logger.info('Limpieza automática de archivos deshabilitada');
      return 0;
    }

    logger.info(`Iniciando limpieza de archivos en: ${directory}`);
    const retentionDays = config.upload.cleanup.retentionDays;
    const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let filesDeleted = 0;

    // Buscar en todos los subdirectorios de uploads
    const directories = await getSubdirectories(directory);
    directories.push(directory); // Incluir el directorio principal

    for (const dir of directories) {
      const files = await fs.promises.readdir(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        
        // Ignorar directorios y archivos especiales
        const stats = await fs.promises.stat(filePath);
        if (stats.isDirectory() || file.startsWith('.')) continue;
        
        // Verificar si el archivo es más antiguo que el período de retención
        const fileAge = now - stats.mtime.getTime();
        if (fileAge > retentionMs) {
          await fs.promises.unlink(filePath);
          logger.info(`Archivo eliminado: ${filePath}`);
          filesDeleted++;
        }
      }
    }

    logger.info(`Limpieza completada. ${filesDeleted} archivos eliminados.`);
    return filesDeleted;
  } catch (error) {
    logger.error(`Error durante la limpieza de archivos: ${error.message}`);
    throw error;
  }
};

/**
 * Obtiene todos los subdirectorios de un directorio
 * @param {string} dir - Directorio a analizar
 * @returns {Promise<string[]>} - Lista de rutas de subdirectorios
 */
const getSubdirectories = async (dir) => {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const dirs = entries
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(dir, entry.name));
  
  const subdirs = await Promise.all(
    dirs.map(d => getSubdirectories(d))
  );
  
  return dirs.concat(subdirs.flat());
};

/**
 * Configura una tarea programada para limpiar archivos viejos
 */
export const scheduleFileCleanup = () => {
  if (!config.upload.cleanup.enabled) {
    logger.info('Limpieza automática de archivos deshabilitada');
    return;
  }

  const intervalHours = config.upload.cleanup.scheduleIntervalHours || 24;
  const intervalMs = intervalHours * 60 * 60 * 1000;

  logger.info(`Programando limpieza automática cada ${intervalHours} horas`);
  
  setInterval(() => {
    cleanupOldFiles()
      .then(count => logger.info(`Limpieza programada completada: ${count} archivos eliminados`))
      .catch(error => logger.error(`Error en limpieza programada: ${error.message}`));
  }, intervalMs);
  
  // Ejecutar limpieza inicial al iniciar la aplicación
  cleanupOldFiles()
    .then(count => logger.info(`Limpieza inicial completada: ${count} archivos eliminados`))
    .catch(error => logger.error(`Error en limpieza inicial: ${error.message}`));
};
