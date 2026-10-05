// React y bibliotecas de React
import { useState, useEffect } from 'react';

// Bibliotecas externas
import { BeatLoader } from 'react-spinners';

// Componentes propios

// Utilidades, servicios y configuración
import { ALLOWED_EXTENSIONS, API_ENDPOINT_UPLOAD } from '../config';
import { useAppContext } from '../context/AppContext';
import fileValidator from '../utils/fileValidator';
import notifications from '../services/notifications';

/**
 * Página CargaArchivoPage
 * 
 * Permite a los usuarios cargar archivos CSV al sistema.
 * Implementa validación del archivo, interacción con la API y estados de carga.
 * 
 * @component
 * @example
 * return (
 *   <CargaArchivoPage />
 * )
 */
function CargaArchivoPage() {
  const { state, actions } = useAppContext();
  const { uploadStatus, connectivity } = state;
  const uploadSummary = uploadStatus.success?.data;
  
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [validatingFile, setValidatingFile] = useState(false);
  const [dragActive, setDragActive] = useState(false); // Estado para arrastrar y soltar

  // Limpiar errores cuando cambia el componente
  useEffect(() => {
    return () => {
      setError(null);
      setValidationErrors([]);
    };
  }, []);

  // Mostrar advertencia cuando no hay conectividad
  useEffect(() => {
    if (!connectivity.isOnline || !connectivity.serverAvailable) {
      setError('Sin conexión al servidor. Verifique su conexión a internet y vuelva a intentarlo.');
    } else {
      // Limpiar error de conectividad si ya estamos conectados
      if (error && error.includes('Sin conexión')) {
        setError(null);
      }
    }
  }, [connectivity.isOnline, connectivity.serverAvailable, error]);

  // Manejadores para arrastrar y soltar
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileValidation(e.dataTransfer.files[0]);
    }
  };

  /**
   * Maneja la validación de archivos, ya sea de la entrada de archivo o del área de arrastrar y soltar
   * 
   * @param {File} selectedFile - El archivo seleccionado a validar
   * @return {Promise<void>}
   */
  const handleFileValidation = async (selectedFile) => {
    setError(null);
    setValidationErrors([]);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    setValidatingFile(true);
    
    try {
      // Usar el servicio de validación de archivos
      const validationResult = await fileValidator.validateCsvFile(selectedFile);
      
      if (!validationResult.valid) {
        setValidationErrors(validationResult.errors);
        notifications.showValidationErrors(validationResult.errors);
        setFile(null);
      } else {
        setFile(selectedFile);
        notifications.showInfo(`Archivo "${selectedFile.name}" seleccionado correctamente.`);
      }
    } catch (error) {
      console.error('Error validando archivo:', error);
      setError('Error al validar el archivo. Por favor, inténtelo de nuevo.');
      notifications.showError('Error al validar el archivo');
      setFile(null);
    } finally {
      setValidatingFile(false);
    }
  };

  /**
   * Inicia el proceso de carga del archivo al servidor
   * Verifica conectividad, prepara FormData y maneja el resultado
   * 
   * @return {Promise<void>}
   */
  const handleUpload = async () => {
    if (!file) return;
    
    // Verificar conectividad antes de intentar subir
    if (!connectivity.isOnline || !connectivity.serverAvailable) {
      // Usar el resultado recién obtenido: `connectivity` es el valor de este render y está desactualizado
      const serverAvailable = await actions.checkServerConnectivity();
      if (!navigator.onLine || !serverAvailable) {
        notifications.showError('Sin conexión al servidor. Por favor, verifique su conexión.');
        return;
      }
    }

    setError(null);
    setValidationErrors([]);

    const formData = new FormData();
    formData.append('file', file);

    console.log('Subiendo archivo:', file.name);
    console.log('URL de destino:', API_ENDPOINT_UPLOAD);

    // Usar el método de subida de archivos del contexto global
    const result = await actions.uploadFile(formData);

    if (result.status === 'error') {
      console.error('Error en la carga del archivo:', result);

      if (result.errors) {
        const errors = Array.isArray(result.errors) 
          ? result.errors 
          : [result.errors];

        setValidationErrors(errors);
        setError(`El archivo contiene errores de validación. 
          Por favor, revise los datos y vuelva a intentarlo.`);
      } else {
        setError(`Error: ${result.message}`);
      }
    } else {
      setFile(null);
    }
  };
  /**
   * Genera un preview del archivo seleccionado
   * 
   * @return {JSX.Element|null} Componente de preview o null si no hay archivo
   */
  const getFilePreview = () => {
    if (!file) return null;

    return (
      <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center">
        <div className="flex-shrink-0 mr-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate">{file.name}</h4>
          <p className="text-xs text-gray-500">
            {(file.size / 1024).toFixed(2)} KB • {new Date().toLocaleDateString()}
          </p>
        </div>
        <button 
          onClick={() => setFile(null)} 
          className="ml-2 flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-red-500"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  };
  /**
   * Renderiza el indicador de progreso durante la carga
   * 
   * @return {JSX.Element|null} Componente de progreso o null si no está cargando
   */
  const renderProgressIndicator = () => {
    if (!uploadStatus.uploading) return null;
    
    return (
      <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Procesando archivo</span>
          <span className="text-sm text-gray-600">{uploadStatus.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-600 h-2 rounded-full transition-all duration-300 ease-in-out" 
            style={{ width: `${uploadStatus.progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-500">
            {file && file.name}
          </span>
          <BeatLoader color="#10B981" loading={true} size={8} />
        </div>
      </div>
    );
  };
  /**
   * Renderiza los errores de validación del archivo si existen
   * 
   * @return {JSX.Element|null} Lista de errores o null si no hay errores
   */
  const renderValidationErrors = () => {
    if (!validationErrors || validationErrors.length === 0) return null;

    return (
      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
        <h4 className="text-sm font-medium text-red-800 mb-1">Errores de validación:</h4>
        <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
          {validationErrors.map((err, index) => (
            <li key={index}>{typeof err === 'string' ? err : err.message}</li>
          ))}
        </ul>
      </div>
    );
  };

  /**
   * Muestra información de depuración sobre el proceso de carga
   */
  const renderDebugInfo = () => {
    if (!error) return null;

    return (
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="text-sm font-medium text-yellow-800 mb-1">Información de depuración:</h4>
        <div className="text-xs text-yellow-700 space-y-1">
          <p><strong>Estado de conectividad:</strong> {connectivity.isOnline ? 'En línea' : 'Sin conexión'}</p>
          <p><strong>Servidor disponible:</strong> {connectivity.serverAvailable ? 'Sí' : 'No'}</p>
          <p><strong>URL de carga:</strong> {API_ENDPOINT_UPLOAD}</p>
          <p><strong>Último error:</strong> {error}</p>
        </div>
      </div>
    );
  };
  // Mostrar banner de estado de conectividad
  const renderConnectivityStatus = () => {
    if (connectivity.isOnline && connectivity.serverAvailable) return null;
    
    return (
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Estado de conexión</h3>
            <div className="mt-1 text-sm text-yellow-700">
              {!connectivity.isOnline 
                ? 'Sin conexión a Internet. Conéctese para cargar archivos.' 
                : 'No se puede conectar al servidor. Intente más tarde.'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Maneja el cambio de archivo seleccionado y ejecuta validaciones
   * 
   * @param {Object} event - Evento del input de tipo file
   * @return {Promise<void>}
   */
  const handleFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    await handleFileValidation(selectedFile);
  };
  return (
    <div className="w-full max-w-3xl mx-auto">
      {renderConnectivityStatus()}
      
      {error && !validationErrors.length && (
        <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200 text-red-700">
          <div className="flex">
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-5 md:p-6">
          <div className="text-center mb-6">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <h2 className="mt-2 text-lg font-medium text-gray-900">Carga de Archivo CSV</h2>
            <p className="mt-1 text-sm text-gray-500">
              Arrastra y suelta un archivo CSV o selecciónalo desde tu equipo
            </p>
          </div>
          
          {/* Área de arrastrar y soltar / seleccionar archivo */}
          <div 
            className={`relative mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors ${
              dragActive 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex flex-wrap justify-center text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500"
                >
                  <span>Seleccionar archivo</span>
                  <input 
                    id="file-upload" 
                    name="file-upload" 
                    type="file" 
                    className="sr-only" 
                    accept=".csv"
                    onChange={handleFileChange}
                    disabled={uploadStatus.uploading || validatingFile}
                  />
                </label>
                <p className="pl-1">o arrastra y suelta aquí</p>
              </div>
              <p className="text-xs text-gray-500">
                Solo archivos {ALLOWED_EXTENSIONS.join(', ')} (máximo 10MB)
              </p>
              
              {validatingFile && (
                <div className="mt-2 flex justify-center">
                  <BeatLoader color="#10B981" size={8} />
                  <span className="ml-2 text-sm text-green-600">Validando archivo...</span>
                </div>
              )}
            </div>
          </div>
          
          {getFilePreview()}
          {renderProgressIndicator()}
          
          <div className="mt-5">
            <button
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              onClick={handleUpload}
              disabled={!file || uploadStatus.uploading || validatingFile || !connectivity.serverAvailable}
            >
              {uploadStatus.uploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando archivo...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Cargar Archivo
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="rounded-b-lg bg-gray-50 p-4 border-t border-gray-200">
          <h3 className="text-xs font-medium text-gray-700 uppercase tracking-wider mb-2">Instrucciones:</h3>
          <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
            <li>La primera fila debe contener los encabezados de columna</li>
            <li>El archivo debe estar en formato CSV con separador de punto y coma (;)</li>
            <li>Campos obligatorios: id_asesor, nombre_asesor, equipo_entidad, compania y usuario</li>
            <li>Campos opcionales: correo_contacto, celular_contacto, rol_asesor y observaciones</li>
            <li>fecha_novedad debe usar YYYY-MM-DD y no puede ser futura</li>
          </ul>
        </div>
      </div>
      
      {renderValidationErrors()}
      {uploadSummary && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <h4 className="font-semibold">Resumen del procesamiento</h4>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <span>Total: <strong>{uploadSummary.totalRows}</strong></span>
            <span>Insertados: <strong>{uploadSummary.insertedRows}</strong></span>
            <span>Errores: <strong>{uploadSummary.errorsCount}</strong></span>
            <span>{uploadSummary.hasErrors ? 'Carga parcial' : 'Carga completa'}</span>
          </div>
        </div>
      )}
      {error && renderDebugInfo()}
    </div>
  );
}

// Definición de PropTypes para el componente
CargaArchivoPage.propTypes = {
  // El componente no recibe props actualmente, pero podría extenderse con:
  // maxFileSize: PropTypes.number,
  // onUploadComplete: PropTypes.func,
  // allowedTypes: PropTypes.arrayOf(PropTypes.string),
};

export default CargaArchivoPage;
