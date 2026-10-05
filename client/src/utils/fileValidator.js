/**
 * Servicio para validación de archivos antes de enviarlos al servidor
 * Proporciona funciones para validar diferentes tipos de archivos
 * Mantiene consistencia con las validaciones del servidor
 */
import { ALLOWED_EXTENSIONS } from '../config';

// Tamaño máximo permitido para archivos (en bytes)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Campos requeridos basados en el esquema del servidor
const REQUIRED_FIELDS = ['id_asesor', 'nombre_asesor', 'equipo_entidad', 'compania', 'usuario'];

/**
 * Valida un archivo CSV
 * @param {File} file - Archivo a validar
 * @returns {Object} - Resultado de la validación {valid, errors}
 */
export const validateCsvFile = async (file) => {
  const errors = [];
  
  // Validar si existe el archivo
  if (!file) {
    return { 
      valid: false, 
      errors: [{ message: 'No se ha seleccionado ningún archivo' }] 
    };
  }
  
  // Validar extensión
  const fileExt = '.' + file.name.split('.').pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
    errors.push({ 
      message: `El tipo de archivo no es válido. Extensiones permitidas: ${ALLOWED_EXTENSIONS.join(', ')}` 
    });
  }
  
  // Validar tamaño
  if (file.size > MAX_FILE_SIZE) {
    errors.push({
      message: `El archivo excede el tamaño máximo permitido de ${MAX_FILE_SIZE / 1024 / 1024}MB`
    });
  }
  
  // Validación de tipo MIME más permisiva (consistente con el servidor)
  const acceptableMimeTypes = [
    'text/csv', 
    'application/vnd.ms-excel', 
    'application/csv', 
    'text/plain',
    'text/x-csv',
    'application/x-csv',
    ''  // Algunos navegadores pueden no asignar tipo
  ];
  
  if (!acceptableMimeTypes.includes(file.type)) {
    console.warn(`Tipo de archivo potencialmente no soportado: ${file.type}`);
    // Solo advertencia, no un error bloqueante
  }
  
  // Validación del contenido del archivo
  if (errors.length === 0) {
    try {
      const contentValidation = await validateCsvContent(file);
      if (!contentValidation.valid) {
        errors.push(...contentValidation.errors);
      }
    } catch (error) {
      errors.push({ message: `Error al analizar el archivo: ${error.message}` });
    }
  }
  
  return { 
    valid: errors.length === 0, 
    errors 
  };
};

/**
 * Detecta el delimitador utilizado en una línea CSV
 * Consistente con la función detectDelimiter del servidor
 * @param {string} line - Línea del CSV (normalmente la cabecera)
 * @returns {string} - Delimitador detectado
 */
const detectDelimiter = (line) => {
  if (!line || line.trim() === '') {
    return ';'; // Delimitador predeterminado
  }

  const delimiters = [';', ',', '\t', '|'];
  const counts = {};
  const fields = {};
  
  // Contar ocurrencias de cada delimitador
  delimiters.forEach(delimiter => {
    counts[delimiter] = (line.match(new RegExp(delimiter, 'g')) || []).length;
    fields[delimiter] = line.split(delimiter).length;
  });
  
  // Analizar cuál es el delimitador más probable
  let maxScore = -1;
  let detectedDelimiter = ';';
  
  Object.entries(counts).forEach(([delimiter, count]) => {
    if (count === 0) return;
    
    const fieldCount = fields[delimiter];
    if (fieldCount <= 1) return;
    
    const score = fieldCount * (count / line.length);
    const bonus = delimiter === ';' ? 1.2 : 1.0;
    const finalScore = score * bonus;
    
    if (finalScore > maxScore) {
      maxScore = finalScore;
      detectedDelimiter = delimiter;
    }
  });
  
  console.log(`Delimitador detectado: "${detectedDelimiter}"`);
  return detectedDelimiter;
};

/**
 * Valida el contenido de un archivo CSV
 * @param {File} file - Archivo CSV
 * @returns {Promise<Object>} - Resultado de la validación
 */
const validateCsvContent = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    const errors = [];
    
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        
        // Verificar si el archivo está vacío
        if (!content || content.trim() === '') {
          errors.push({ message: 'El archivo está vacío' });
          return resolve({ valid: false, errors });
        }
        
        // Obtener las líneas del archivo
        const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
        
        // Verificar si hay al menos una línea de encabezado
        if (lines.length === 0) {
          errors.push({ message: 'El archivo no contiene datos' });
          return resolve({ valid: false, errors });
        }
        
        // Detectar el delimitador usado en el archivo
        const headerLine = lines[0];
        const delimiter = detectDelimiter(headerLine);
        
        console.log("Primera línea del CSV:", headerLine);
        
        // Analizar las cabeceras
        const headers = headerLine.split(delimiter).map(h => {
          // Eliminar comillas si están presentes
          let field = h.trim();
          if ((field.startsWith('"') && field.endsWith('"')) || 
              (field.startsWith("'") && field.endsWith("'"))) {
            field = field.substring(1, field.length - 1);
          }
          // Normalizar de la misma forma que el servidor
          return field.toLowerCase().trim();
        });
        
        console.log("Encabezados detectados:", headers);
        
        // Verificar campos requeridos
        const missingFields = [];
        REQUIRED_FIELDS.forEach(requiredField => {
          if (!headers.some(h => h === requiredField)) {
            missingFields.push(requiredField);
          }
        });
        
        if (missingFields.length > 0) {
          errors.push({
            message: `Faltan columnas requeridas: ${missingFields.join(', ')}`,
            field: 'columns',
            missingFields
          });
        }
        
        // Verificar que hay datos además del encabezado
        if (lines.length < 2) {
          errors.push({ message: 'El archivo no contiene filas de datos, solo el encabezado' });
        } else {
          // Verificar que las filas tengan el mismo número de campos
          const firstDataRow = lines[1].split(delimiter);
          
          if (firstDataRow.length !== headers.length) {
            errors.push({ 
              message: `El formato de datos es incorrecto. La primera fila de datos tiene ${firstDataRow.length} campos pero el encabezado tiene ${headers.length} campos.` 
            });
          }
          
          // Verificar formato básico de una muestra de filas
          const sampleSize = Math.min(5, lines.length - 1);
          for (let i = 1; i <= sampleSize; i++) {
            const dataRow = lines[i].split(delimiter);
            
            // Verificar si la fila tiene valores para los campos requeridos
            REQUIRED_FIELDS.forEach((field) => {
              const fieldIndex = headers.indexOf(field);
              if (fieldIndex !== -1 && 
                  (fieldIndex >= dataRow.length || !dataRow[fieldIndex].trim())) {
                errors.push({
                  message: `Fila ${i+1}: Falta valor para el campo requerido "${field}"`,
                  field,
                  row: i+1
                });
              }
            });
          }
        }
        
        resolve({
          valid: errors.length === 0,
          errors,
          metadata: {
            headers,
            delimiter,
            rowCount: lines.length - 1
          }
        });
      } catch (error) {
        console.error("Error al procesar CSV:", error);
        errors.push({ message: `Error al procesar el archivo: ${error.message}` });
        resolve({ valid: false, errors });
      }
    };
    
    reader.onerror = () => {
      errors.push({ message: 'Error al leer el archivo' });
      resolve({ valid: false, errors });
    };
    
    // Leer una porción mayor del archivo para validación más completa
    const blob = file.slice(0, 32 * 1024);
    reader.readAsText(blob);
  });
};

export default {
  validateCsvFile
};