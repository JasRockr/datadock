/**
 * Módulo para procesamiento de archivos CSV
 * Proporciona funciones para convertir CSV a estructuras JSON utilizables
 */
import fs from 'fs/promises';
import config from '../config.js';
import { FileProcessingError } from './errorHandler.js';
import logger from './logger.js';

/**
 * Detecta el delimitador utilizado en un archivo CSV
 * @param {string} headerLine - Primera línea del CSV (cabecera)
 * @param {string} [forcedDelimiter] - Forzar un delimitador específico
 * @returns {string} - Delimitador detectado (';', ',', '\t', '|')
 */
export const detectDelimiter = (headerLine, forcedDelimiter = null) => {
  // Si se fuerza un delimitador, usarlo directamente
  if (forcedDelimiter) {
    return forcedDelimiter;
  }

  // Delimitador por defecto en la configuración
  const defaultDelimiter = config.csvProcessing.delimiter || ';';
  
  // Si la cabecera está vacía, devolver el delimitador por defecto
  if (!headerLine || headerLine.trim() === '') {
    return defaultDelimiter;
  }

  const delimiters = [';', ',', '\t', '|'];
  const counts = {};
  const fields = {};
  
  // Contar ocurrencias de cada delimitador
  delimiters.forEach(delimiter => {
    // Contar apariciones del delimitador
    // split y no RegExp: '|' en una expresión regular coincide con la cadena vacía
    counts[delimiter] = headerLine.split(delimiter).length - 1;
    
    // Dividir la línea por este delimitador para ver cuántos campos se obtienen
    fields[delimiter] = headerLine.split(delimiter).length;
  });
  
  // Analizar cuál es el delimitador más probable
  let maxScore = -1;
  let detectedDelimiter = defaultDelimiter;
  
  Object.entries(counts).forEach(([delimiter, count]) => {
    if (count === 0) return; // Ignorar delimitadores que no aparecen
    
    // Calcular una puntuación basada en:
    // 1. Número de campos resultantes (más es mejor)
    // 2. Consistencia en la distribución de los campos
    const fieldCount = fields[delimiter];
    
    // Si sólo divide en 1 campo, probablemente no es el delimitador correcto
    if (fieldCount <= 1) return;
    
    // Calcular la puntuación: número de campos * frecuencia del delimitador
    const score = fieldCount * (count / headerLine.length);
    
    // Dar una bonificación si es el delimitador por defecto
    const bonus = delimiter === defaultDelimiter ? 1.2 : 1.0;
    const finalScore = score * bonus;
    
    if (finalScore > maxScore) {
      maxScore = finalScore;
      detectedDelimiter = delimiter;
    }
  });
  
  // Si no se detectó ningún delimitador, usar el predeterminado
  return detectedDelimiter;
};

/**
 * Procesa un archivo CSV y lo convierte a un array de objetos.
 * Todos los valores se devuelven como texto: el tipo de cada campo lo decide el esquema
 * de mapeo del dominio (p. ej. asesorMappingSchema), nunca el aspecto del valor.
 * @param {Object} file - Objeto del archivo subido (multer)
 * @param {Object} options - Opciones de procesamiento
 * @param {string|null} [options.delimiter] - Separador forzado; null o vacío = detectarlo
 * @returns {Promise<Array>} - Array de objetos con los datos del CSV
 * @throws {FileProcessingError} - Si hay errores en el procesamiento
 */
export const processCsvFile = async (file, options = {}) => {
  const {
    encoding = config.csvProcessing.encoding,
    skipEmptyLines = config.csvProcessing.skipEmptyLines,
    headerRowRequired = config.csvProcessing.headerRowRequired,
    trimValues = config.csvProcessing.trimValues,
    normalizeHeaderFields = true,
    delimiter = config.csvProcessing.delimiter,
  } = options;
  
  try {
    // Verificar que el archivo existe
    if (!file || (!file.buffer && !file.path)) {
      throw new FileProcessingError('El archivo CSV no es válido o no ha sido subido correctamente');
    }
    
    // Leer el contenido del archivo
    const fileContentBuffer = file.buffer || await fs.readFile(file.path);
    let fileContent = fileContentBuffer.toString(encoding);
    
    // Eliminar BOM si existe
    if (fileContent.charCodeAt(0) === 0xfeff) {
      fileContent = fileContent.substring(1);
    }
    
    // Dividir el contenido en líneas (compatible con Windows y Linux)
    const allLines = fileContent.split(/\r?\n/);
    
    // Verificar que hay al menos una línea
    if (allLines.length === 0 || (allLines.length === 1 && allLines[0].trim() === '')) {
      throw new FileProcessingError('El archivo CSV está vacío o no contiene datos utilizables');
    }
    
    // La primera línea es la cabecera
    const header = allLines[0];
    
    // Detectar el delimitador (utilizando el especificado en options si se proporciona)
    const detectedDelimiter = detectDelimiter(header, delimiter);
    logger.info(`Delimitador detectado: "${detectedDelimiter}"`);
    
    // Procesar la cabecera
    const headerFields = header.split(detectedDelimiter).map(field => {
      let processedField = field;
      
      // Eliminar comillas si están presentes
      if ((processedField.startsWith('"') && processedField.endsWith('"')) || 
          (processedField.startsWith("'") && processedField.endsWith("'"))) {
        processedField = processedField.substring(1, processedField.length - 1);
      }
      
      // Limpiar y normalizar el nombre del campo
      processedField = trimValues ? processedField.trim() : processedField;
      
      if (normalizeHeaderFields) {
        // Convertir a minúsculas y reemplazar espacios con guiones bajos
        processedField = processedField.toLowerCase().replace(/\s+/g, '_');
      }
      
      return processedField;
    });
    
    // Verificar que la cabecera tiene campos
    if (headerRowRequired && (headerFields.length === 0 || headerFields.every(field => !field))) {
      throw new FileProcessingError('La cabecera del CSV no contiene campos válidos');
    }
    
    // Procesar las líneas de datos
    const dataLines = allLines.slice(1);
    let objectList = [];
    let lineErrors = [];
    
    // Procesar cada línea
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      
      // Saltar líneas vacías si así se configura
      if (skipEmptyLines && (!line || line.trim() === '')) {
        continue;
      }
      
      // Dividir la línea en campos usando el delimitador detectado
      const values = line.split(detectedDelimiter).map(value => {
        let processedValue = value;
        
        // Eliminar comillas si están presentes
        if ((processedValue.startsWith('"') && processedValue.endsWith('"')) || 
            (processedValue.startsWith("'") && processedValue.endsWith("'"))) {
          processedValue = processedValue.substring(1, processedValue.length - 1);
        }
        
        // Limpiar el valor
        return trimValues ? processedValue.trim() : processedValue;
      });
      
      // Si la línea está vacía, saltar
      if (values.every(v => !v)) continue;
      
      // Crear objeto con los datos de la línea
      const rowObject = {};
      let hasData = false;
      
      // Mapear valores a campos de la cabecera
      for (let j = 0; j < headerFields.length; j++) {
        const field = headerFields[j];
        
        if (!field) continue; // Saltar campos de cabecera vacíos
        
        // Obtener el valor, manejar caso donde falten valores
        const value = j < values.length ? values[j] : '';
        rowObject[field] = value;
        if (value) hasData = true;
      }
      
      // Solo agregar la línea si tiene datos
      if (hasData) {
        objectList.push(rowObject);
      }
    }
    
    // Verificar que hay datos
    if (objectList.length === 0) {
      throw new FileProcessingError('No se encontraron filas de datos válidas en el archivo CSV');
    }
    
    // Si hay errores, incluirlos en los detalles
    if (lineErrors.length > 0) {
      logger.warn(`CSV procesado con ${lineErrors.length} advertencias`, { 
        warnings: lineErrors.slice(0, 5),
        file: file.originalname 
      });
    }
    
    logger.info(`Procesadas ${objectList.length} líneas de datos del archivo CSV`, {
      file: file.originalname,
      fields: headerFields.length
    });
    
    return objectList;
  } catch (error) {
    // Rethrow errores específicos de la aplicación
    if (error instanceof FileProcessingError) {
      throw error;
    }
    
    // Para errores de lectura de archivo
    if (error.code === 'ENOENT') {
      throw new FileProcessingError('No se pudo encontrar el archivo CSV', {
        originalError: error.message,
        file: file?.originalname,
        path: file?.path
      });
    }
    
    // Para errores de permisos
    if (error.code === 'EACCES') {
      throw new FileProcessingError('Acceso denegado al archivo CSV', {
        originalError: error.message,
        file: file?.originalname,
        path: file?.path
      });
    }
    
    // Envolver otros errores con más contexto
    throw new FileProcessingError(`Error al procesar el archivo CSV: ${error.message}`, {
      originalError: error.message,
      file: file?.originalname,
      line: error.line
    });
  }
};

/**
 * Escribe un array de objetos a un archivo CSV
 * @param {Array} data - Array de objetos a convertir a CSV
 * @param {string} outputPath - Ruta donde guardar el archivo CSV
 * @param {Object} options - Opciones de escritura
 * @returns {Promise<string>} - Ruta del archivo guardado
 */
export const writeObjectsToCsv = async (data, outputPath, options = {}) => {
  const {
    delimiter = ',',
    includeHeader = true,
    encoding = 'utf8',
    quoteStrings = true
  } = options;
  
  try {
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new FileProcessingError('No hay datos para escribir en el CSV');
    }
    
    // Extraer todos los campos únicos (hacemos union de todas las claves)
    const allFields = new Set();
    data.forEach(item => {
      Object.keys(item).forEach(key => allFields.add(key));
    });
    const fields = Array.from(allFields);
    
    // Crear contenido CSV
    const lines = [];
    
    // Escribir cabecera
    if (includeHeader) {
      const headerLine = fields.join(delimiter);
      lines.push(headerLine);
    }
    
    // Escribir filas de datos
    data.forEach(item => {
      const values = fields.map(field => {
        const value = item[field];
        if (value === undefined || value === null) {
          return '';
        }
        
        // Formatear según el tipo de dato
        if (typeof value === 'string') {
          return quoteStrings ? `"${value.replace(/"/g, '""')}"` : value;
        } else if (value instanceof Date) {
          // Formato de fecha simple para ejemplo (en producción usar librería de fechas)
          return value.toISOString().split('T')[0];
        } else {
          return String(value);
        }
      });
      
      lines.push(values.join(delimiter));
    });
    
    // Escribir a archivo
    await fs.writeFile(outputPath, lines.join('\n'), { encoding });
    
    return outputPath;
  } catch (error) {
    if (error instanceof FileProcessingError) {
      throw error;
    }
    
    throw new FileProcessingError(`Error al escribir archivo CSV: ${error.message}`, {
      originalError: error.message,
      outputPath
    });
  }
};
