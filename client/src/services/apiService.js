/**
 * Servicio centralizado para manejar todas las llamadas a la API
 * Proporciona métodos para cada endpoint y maneja errores de forma consistente
 */
import {
  API_BASE,
  API_ENDPOINT_ASESORES,
  API_ENDPOINT_UPLOAD
} from '../config.js';

/**
 * Manejador global de errores para el servicio API
 * @param {Response} response - Respuesta de fetch
 * @returns {Object} - Objeto con datos de la respuesta o error formateado
 */
const handleResponse = async (response) => {
  let data;
  try {
    // Intentar parsear la respuesta como JSON (algunas respuestas pueden no ser JSON)
    data = await response.json();
  } catch (error) {
    // Si no es JSON, crear un objeto con información básica
    data = {
      status: response.ok ? 'success' : 'error',
      message: response.statusText
    };
  }
  
  if (!response.ok) {
    console.error(`Error en respuesta de API (${response.status}):`, data);
    // Formato estandarizado para errores
    return {
      status: 'error',
      code: response.status,
      message: data.message || response.statusText,
      errors: data.errors || null,
      details: data.details || null,
    };
  }
  
  // Registro para depuración
  console.log('Respuesta de API correcta:', {
    endpoint: response.url,
    status: response.status,
    data: data
  });
  
  return data;
};

/**
 * Servicio para operaciones de API
 */
const ApiService = {  /**
   * Obtiene la lista de asesores
   * @param {Object} params - Parámetros de filtrado opcionales
   * @returns {Promise<Object>} - Datos de asesores o error
   */
  fetchAsesores: async (params = {}) => {
    try {
      // Construir URL con parámetros de consulta si existen
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          queryParams.append(key, params[key]);
        }
      });
      
      const url = `${API_ENDPOINT_ASESORES}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      console.log('Fetching asesores from URL:', url);
      const response = await fetch(url);
      const result = await handleResponse(response);
      console.log('Asesores API response:', result);
      return result;
    } catch (error) {
      console.error('Error al obtener asesores:', error);
      return {
        status: 'error',
        message: 'Error de conectividad al obtener asesores',
        details: error.message
      };
    }
  },
  
  /**
   * Envía un archivo para procesamiento
   * @param {FormData} formData - FormData con el archivo a cargar
   * @returns {Promise<Object>} - Resultado del procesamiento o error
   */  uploadFile: async (formData) => {
    try {
      console.log('Enviando archivo a:', API_ENDPOINT_UPLOAD);
      
      const response = await fetch(API_ENDPOINT_UPLOAD, {
        method: 'POST',
        body: formData,
        // No configurar Content-Type para que el navegador establezca 
        // automáticamente el boundary para el multipart/form-data
      });
      
      return await handleResponse(response);
    } catch (error) {
      console.error('Error al cargar archivo:', error);
      return {
        status: 'error',
        message: 'Error de conectividad al cargar el archivo: ' + error.message,
        details: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      };
    }
  },
  
  /**
   * Verifica la conectividad con el servidor
   * @returns {Promise<boolean>} - true si el servidor está disponible
   */
  checkConnectivity: async () => {
    try {
      const controller = new AbortController();
      // Timeout para la solicitud
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      // /health no toca la base de datos: mide solo si el servidor responde
      const response = await fetch(`${API_BASE}/health`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.warn('Error de conectividad:', error);
      return false;
    }
  }
};

export default ApiService;