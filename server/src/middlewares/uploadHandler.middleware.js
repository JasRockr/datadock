import multer from 'multer';
import upload from '../utils/fileUpload.js';
import { processCsvFile } from '../utils/csvHandler.js';
import { hasValidExtension } from '../utils/fileUtils.js';
import { AppError, FileValidationError, FileProcessingError } from '../utils/errorHandler.js';

// Upload file
export function uploadFile(req, res, next) {
  upload.single('file')(req, res, err => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('El archivo es demasiado grande.', 413, 'ERR_FILE_TOO_LARGE'));
      }
      return next(new FileValidationError(`Error en la carga del archivo: ${err.message}`));
    }
    if (err) {
      return next(err);
    }
    next();
  });
}

// Process file
export async function processFile(req, res, next) {
  const file = req.file;

  if (!file) {
    return next(new FileValidationError('No se proporcionó ningún archivo.'));
  }

  if (!hasValidExtension(file)) {
    return next(new FileValidationError('Formato de archivo no admitido.'));
  }

  try {
    req.dataRows = await processCsvFile(file);
    next();
  } catch (error) {
    // Un CSV mal formado o vacío es un error del cliente, no del servidor
    if (error instanceof FileProcessingError) {
      return next(new FileValidationError(error.message));
    }
    next(error);
  }
}
