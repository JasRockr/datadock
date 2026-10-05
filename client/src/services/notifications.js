/**
 * Servicio de notificaciones utilizando SweetAlert2
 * Proporciona funciones para mostrar diferentes tipos de notificaciones y alertas
 */
import Swal from 'sweetalert2';

// Configuración base para las notificaciones toast
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  }
});

/**
 * Muestra una notificación tipo toast
 * @param {string} type - Tipo de notificación (success, error, warning, info)
 * @param {string} message - Mensaje a mostrar
 */
export const showToast = (type, message) => {
  Toast.fire({
    icon: type,
    title: message
  });
};

/**
 * Muestra una notificación de éxito
 * @param {string} message - Mensaje de éxito
 */
export const showSuccess = (message) => {
  showToast('success', message);
};

/**
 * Muestra una notificación de error
 * @param {string} message - Mensaje de error
 */
export const showError = (message) => {
  showToast('error', message);
};

/**
 * Muestra una notificación de advertencia
 * @param {string} message - Mensaje de advertencia
 */
export const showWarning = (message) => {
  showToast('warning', message);
};

/**
 * Muestra una notificación informativa
 * @param {string} message - Mensaje informativo
 */
export const showInfo = (message) => {
  showToast('info', message);
};

/**
 * Muestra una alerta modal con detalles del resultado
 * @param {Object} result - Resultado de la operación
 * @param {string} result.status - Estado (success, error)
 * @param {string} result.message - Mensaje principal
 * @param {Object} [result.details] - Detalles adicionales
 */
export const showResultAlert = (result) => {
  const { status, message, details } = result;
  const isSuccess = status === 'success';
  
  let html = '';
  if (details) {
    if (details.insertedRows !== undefined) {
      html += `<div class="mt-3 text-left">
        <p><strong>Filas procesadas:</strong> ${details.totalRows || 0}</p>
        <p><strong>Filas insertadas:</strong> ${details.insertedRows || 0}</p>
        ${details.errorsCount ? `<p class="text-red-600"><strong>Errores:</strong> ${details.errorsCount}</p>` : ''}
      </div>`;
    }
  }
  
  Swal.fire({
    icon: isSuccess ? 'success' : 'error',
    title: isSuccess ? '¡Operación exitosa!' : 'Error',
    text: message,
    html: html || undefined,
    confirmButtonColor: '#10B981',
  });
};

/**
 * Muestra una alerta de confirmación
 * @param {string} title - Título de la confirmación
 * @param {string} text - Texto descriptivo
 * @param {string} confirmButtonText - Texto del botón de confirmación
 * @returns {Promise<boolean>} - Promesa que se resuelve a true si el usuario confirma
 */
export const showConfirm = async (title, text, confirmButtonText = 'Confirmar') => {
  const result = await Swal.fire({
    title,
    text,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#10B981',
    cancelButtonColor: '#EF4444',
    confirmButtonText,
    cancelButtonText: 'Cancelar'
  });
  
  return result.isConfirmed;
};

/**
 * Muestra una alerta con los errores de validación
 * @param {Array} errors - Lista de errores de validación
 */
export const showValidationErrors = (errors) => {
  if (!errors || errors.length === 0) return;
  
  // Crear HTML para la lista de errores
  let html = `<div class="mt-3 text-left"><ul class="list-disc pl-5">`;
  
  // Limitar a máximo 5 errores para no sobrecargar la alerta
  const displayErrors = errors.slice(0, 5);
  const hasMoreErrors = errors.length > 5;
  
  displayErrors.forEach(err => {
    html += `<li>
      ${err.field ? `<strong>${err.field}:</strong> ` : ''}
      ${err.message || JSON.stringify(err)}
    </li>`;
  });
  
  if (hasMoreErrors) {
    html += `<li>Y ${errors.length - 5} errores más...</li>`;
  }
  
  html += `</ul></div>`;
  
  Swal.fire({
    icon: 'error',
    title: 'Errores de validación',
    html,
    confirmButtonColor: '#10B981',
  });
};

export default {
  showToast,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showResultAlert,
  showConfirm,
  showValidationErrors
};