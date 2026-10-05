/**
 * Módulo de utilidades para manejo de archivos
 * Proporciona funciones reutilizables para operaciones con archivos
 */
import fs from 'fs/promises';
import path from 'path';
import config from '../config.js';
import { FileProcessingError } from './errorHandler.js';

/**
 * Comprueba si un archivo tiene una extensión permitida
 * @param {Object} file - Objeto del archivo subido (multer)
 * @param {Array} allowedExtensions - Extensiones permitidas
 * @returns {boolean} - true si es válido, false si no
 */
export const hasValidExtension = (file, allowedExtensions = config.upload.allowedExtensions) => {
  if (!file || !file.originalname) return false;
  const fileExtension = path.extname(file.originalname).toLowerCase();
  return allowedExtensions.includes(fileExtension);
};

/**
 * Asegura que un directorio exista, creándolo si es necesario
 * @param {string} dirPath - Ruta del directorio
 * @returns {Promise<void>}
 */
export const ensureDirectoryExists = async (dirPath) => {
  try {
    await fs.access(dirPath);
  } catch (error) {
    // Si el directorio no existe, lo creamos
    if (error.code === 'ENOENT') {
      await fs.mkdir(dirPath, { recursive: true });
    } else {
      throw new FileProcessingError(`Error al verificar el directorio ${dirPath}`, {
        originalError: error.message
      });
    }
  }
};

/**
 * Genera un nombre de archivo único para guardar
 * @param {string} originalName - Nombre original del archivo
 * @returns {string} - Nombre único para el archivo
 */
export const generateUniqueFilename = (originalName) => {
  const fileExtension = path.extname(originalName);
  const filenameWithoutExtension = path.basename(originalName, fileExtension);
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `${filenameWithoutExtension}_${uniqueSuffix}${fileExtension}`;
};

/**
 * Guarda un archivo en formato JSON
 * @param {string} originalName - Nombre base para el archivo JSON
 * @param {Object|Array} data - Datos a guardar en formato JSON
 * @param {string} outputDir - Directorio donde guardar el archivo JSON
 * @returns {Promise<string>} - Ruta completa del archivo guardado
 */
export const saveAsJson = async (originalName, data, outputDir = path.join(config.upload.directory, 'json')) => {
  try {
    // Asegurar que el directorio existe
    await ensureDirectoryExists(outputDir);
    
    // Generar nombre para el archivo JSON
    const baseName = path.basename(originalName, path.extname(originalName));
    const jsonFilename = `${baseName}_${Date.now()}.json`;
    const outputPath = path.join(outputDir, jsonFilename);
    
    // Convertir a JSON con formato
    const jsonContent = JSON.stringify(data, null, 2);
    
    // Guardar el archivo
    await fs.writeFile(outputPath, jsonContent, 'utf8');
    
    return outputPath;
  } catch (error) {
    throw new FileProcessingError(`Error al guardar el archivo JSON: ${originalName}`, {
      originalError: error.message
    });
  }
};

/**
 * Elimina un archivo del sistema de archivos
 * @param {string} filePath - Ruta del archivo a eliminar
 * @returns {Promise<void>}
 */
export const removeFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // Si el archivo no existe, ignoramos el error
    if (error.code !== 'ENOENT') {
      throw new FileProcessingError(`Error al eliminar el archivo: ${filePath}`, {
        originalError: error.message
      });
    }
  }
};

/**
 * Elimina un directorio y todo su contenido de forma recursiva
 * @param {string} dirPath - Ruta del directorio a eliminar
 * @returns {Promise<void>}
 */
export const removeDirectory = async (dirPath) => {
  try {
    // Verificar si la ruta existe
    const stats = await fs.stat(dirPath);
    
    if (stats.isDirectory()) {
      // Leer el contenido del directorio
      const files = await fs.readdir(dirPath);
      
      // Eliminar recursivamente cada archivo/directorio
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const fileStats = await fs.stat(filePath);
        
        if (fileStats.isDirectory()) {
          await removeDirectory(filePath);
        } else {
          await removeFile(filePath);
        }
      }
      
      // Eliminar el directorio vacío
      await fs.rmdir(dirPath);
    } else {
      await removeFile(dirPath);
    }
  } catch (error) {
    // Si la ruta no existe, ignoramos el error
    if (error.code !== 'ENOENT') {
      throw new FileProcessingError(`Error al eliminar el directorio: ${dirPath}`, {
        originalError: error.message
      });
    }
  }
};

/**
 * Elimina un archivo o directorio y también su carpeta contenedora
 * @param {string} filePath - Ruta del archivo o directorio a eliminar
 * @returns {Promise<void>}
 * @throws {FileProcessingError} - Si hay un error durante la eliminación
 */
export const removeFileAndDirectory = async (filePath) => {
  try {
    // Verificar si la ruta existe
    const stats = await fs.stat(filePath);
    const containingFolder = path.dirname(filePath);

    if (stats.isDirectory()) {
      // Si es un directorio, eliminar todos sus contenidos recursivamente
      const files = await fs.readdir(filePath);
      
      for (const file of files) {
        const fileToRemove = path.join(filePath, file);
        await removeFileAndDirectory(fileToRemove);
      }

      // Eliminar el directorio vacío
      await fs.rmdir(filePath);
      console.log(`Directorio eliminado: ${filePath}`);
    } else {
      // Eliminar el archivo
      await removeFile(filePath);
      console.log(`Archivo eliminado: ${filePath}`);
    }

    try {
      // Intentar eliminar la carpeta contenedora
      // (solo si está vacía, fs.rmdir fallará si no lo está)
      await fs.rmdir(containingFolder);
      console.log(`Carpeta contenedora eliminada: ${containingFolder}`);
    } catch (folderError) {
      // Si la carpeta no está vacía o hay otro problema, solo registrarlo
      if (folderError.code !== 'ENOENT' && folderError.code !== 'ENOTEMPTY') {
        console.warn(`No se pudo eliminar la carpeta contenedora: ${containingFolder}. Razón: ${folderError.message}`);
      }
    }
    
  } catch (error) {
    // Si la ruta no existe, ignorar el error
    if (error.code === 'ENOENT') {
      console.warn(`La ruta ${filePath} no existe, nada que eliminar.`);
      return;
    }
    
    // Para otros errores, lanzar una excepción
    throw new FileProcessingError(`Error al eliminar el archivo o directorio: ${filePath}`, {
      originalError: error.message
    });
  }
};