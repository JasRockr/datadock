import PropTypes from 'prop-types';

/**
 * Componente ConnectivityStatus
 * 
 * Maneja la visualización de advertencias de conectividad, estados de carga y mensajes de error.
 * 
 * @component
 * @example
 * return (
 *   <ConnectivityStatus
 *     isOnline={isOnline}
 *     serverAvailable={serverAvailable}
 *     loading={loading}
 *     refreshing={refreshing}
 *     error={error}
 *     onRetry={handleRefresh}
 *   />
 * )
 */
function ConnectivityStatus({ isOnline, serverAvailable, loading, refreshing, error, onRetry }) {
  if (loading && !refreshing) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
        <p className="text-gray-600">Cargando datos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded" role="alert">
        <p className="font-bold">Error</p>
        <p>{error}</p>
        <button 
          onClick={onRetry}
          className="mt-3 bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded text-sm"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!isOnline || !serverAvailable) {
    return (
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-2 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-yellow-700">
            {!isOnline 
              ? 'Sin conexión a Internet. Los datos mostrados podrían no estar actualizados.' 
              : 'No se puede conectar al servidor. Mostrando datos en caché.'}
          </p>
        </div>
      </div>
    );
  }

  return null;
}

ConnectivityStatus.propTypes = {
  isOnline: PropTypes.bool.isRequired,
  serverAvailable: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
  refreshing: PropTypes.bool.isRequired,
  error: PropTypes.string,
  onRetry: PropTypes.func.isRequired,
};

export default ConnectivityStatus;
