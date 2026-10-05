/**
 * Módulo de utilidades para procesamiento de datos
 * Proporciona funciones reutilizables para manipulación y validación de datos
 */
import { FileProcessingError } from './errorHandler.js';

/**
 * Limpia una cadena eliminando espacios innecesarios
 * @param {string} value - La cadena a limpiar
 * @returns {string} - La cadena limpia
 */
export const cleanString = (value) => {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/\s+/g, ' ');
};

/**
 * Convierte un valor al tipo de datos adecuado según su contenido
 * @param {string} value - Valor a convertir
 * @param {string} targetType - Tipo de dato objetivo ('string', 'number', 'date', 'boolean', 'auto')
 * @returns {any} - El valor convertido al tipo adecuado
 */
export const convertDataType = (value, targetType = 'auto') => {
  // Si es null, undefined o cadena vacía, devolver valor específico según tipo
  if (value === null || value === undefined || value === '') {
    switch (targetType) {
      case 'string': return '';
      case 'number': return null;
      case 'date': return null;
      case 'boolean': return false;
      default: return value;
    }
  }
  
  // Limpiar cadenas
  if (typeof value === 'string') {
    value = cleanString(value);
  }
  
  // Conversiones específicas
  switch (targetType) {
    case 'string':
      return String(value);
      
    case 'number': {
      const num = Number(value);
      return isNaN(num) ? null : num;
    }

    case 'date':
      try {
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date;
      } catch (error) {
        return null;
      }
      
    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (typeof value === 'number') return value !== 0;
      if (typeof value === 'string') {
        const lowercased = value.toLowerCase();
        return ['true', 't', 'yes', 'y', '1', 'si', 'sí'].includes(lowercased);
      }
      return Boolean(value);
      
    case 'auto':
    default: {
      // Detectar tipo automáticamente
      if (typeof value !== 'string') return value;
      
      // Verificar si es booleano
      if (['true', 'false', 'yes', 'no', 'si', 'sí', 'no', 't', 'f', 'y', 'n'].includes(value.toLowerCase())) {
        return convertDataType(value, 'boolean');
      }
      
      // Verificar si es número
      if (!isNaN(Number(value))) {
        return Number(value);
      }
      
      // Verificar si es fecha
      const potentialDate = new Date(value);
      if (!isNaN(potentialDate.getTime())) {
        return potentialDate;
      }
      
      // Por defecto, devolver como string
      return value;
    }
  }
};

/**
 * Mapea propiedades de un objeto a otro según un esquema
 * @param {Object} data - Datos de origen
 * @param {Object} schema - Esquema de mapeo. Por cada propiedad destino:
 *   - source: nombre de la propiedad origen, o función (data) => valor
 *   - type: 'string' | 'number' | 'date' | 'boolean' | 'auto'
 *   - required: si es true y el valor está vacío, se registra un error
 *   - default (alias defaultValue): valor, o función (data) => valor, cuando el origen está vacío
 *   - transform: función (valorConvertido) => valorFinal, se aplica después de convertir el tipo
 * @returns {Object} - Objeto mapeado según el esquema
 */
export const mapDataToSchema = (data, schema) => {
  const result = {};
  const errors = [];
  const isEmpty = value => value === undefined || value === null || value === '';

  Object.entries(schema).forEach(([targetProp, config]) => {
    const { source, type = 'auto', required = false, transform } = config;
    const fallback = config.default !== undefined ? config.default : config.defaultValue;

    // Obtener valor fuente (puede ser un nombre de propiedad o una función)
    let sourceValue = typeof source === 'function'
      ? source(data)
      : data[source];

    if (required && isEmpty(sourceValue)) {
      errors.push(`El campo ${targetProp} es requerido`);
      return;
    }

    if (isEmpty(sourceValue) && fallback !== undefined) {
      sourceValue = typeof fallback === 'function' ? fallback(data) : fallback;
    }

    try {
      const converted = convertDataType(sourceValue, type);
      result[targetProp] = transform ? transform(converted) : converted;
    } catch (error) {
      errors.push(`Error al convertir ${targetProp}: ${error.message}`);
    }
  });

  if (errors.length > 0) {
    throw new FileProcessingError(`Error en la validación de datos: ${errors.join('; ')}`, { errors });
  }
  
  return result;
};

/**
 * Valida un objeto de datos contra un esquema
 * @param {Object} data - Datos a validar
 * @param {Object} schema - Esquema de validación
 * @returns {boolean} - true si los datos son válidos
 * @throws {FileProcessingError} - Si hay errores de validación
 */
export const validateDataWithSchema = (data, schema) => {
  const errors = [];
  
  Object.entries(schema).forEach(([field, rules]) => {
    const value = data[field];
    
    // Verificar reglas
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`El campo ${field} es requerido`);
    }
    
    if (value !== undefined && value !== null) {
      // Validar tipo
      if (rules.type) {
        const actualType = typeof value;
        if (
          (rules.type === 'string' && actualType !== 'string') ||
          (rules.type === 'number' && actualType !== 'number') ||
          (rules.type === 'boolean' && actualType !== 'boolean') ||
          (rules.type === 'date' && !(value instanceof Date))
        ) {
          errors.push(`El campo ${field} debe ser de tipo ${rules.type}`);
        }
      }
      
      // Validar patrón si es string
      if (rules.pattern && typeof value === 'string' && !new RegExp(rules.pattern).test(value)) {
        errors.push(`El campo ${field} no cumple con el formato requerido`);
      }
      
      // Validar min/max para números
      if (typeof value === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`El campo ${field} debe ser mayor o igual a ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`El campo ${field} debe ser menor o igual a ${rules.max}`);
        }
      }
      
      // Validar minLength/maxLength para strings
      if (typeof value === 'string') {
        if (rules.minLength !== undefined && value.length < rules.minLength) {
          errors.push(`El campo ${field} debe tener al menos ${rules.minLength} caracteres`);
        }
        if (rules.maxLength !== undefined && value.length > rules.maxLength) {
          errors.push(`El campo ${field} debe tener como máximo ${rules.maxLength} caracteres`);
        }
      }
    }
  });
  
  if (errors.length > 0) {
    throw new FileProcessingError('Datos inválidos', { errors });
  }
  
  return true;
};

/**
 * Transforma un array de datos aplicando un esquema de mapeo a cada elemento
 * @param {Array} dataArray - Array de objetos de datos
 * @param {Object} schema - Esquema de mapeo
 * @returns {Array} - Array transformado
 */
export const transformDataArray = (dataArray, schema) => {
  return dataArray.map((item, index) => {
    try {
      return mapDataToSchema(item, schema);
    } catch (error) {
      // Agregar información sobre el índice donde falló
      error.details = {
        ...error.details,
        index,
        item
      };
      throw error;
    }
  });
};