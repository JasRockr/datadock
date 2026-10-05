/**
 * Contexto global para gestionar el estado compartido de la aplicación
 * Proporciona acceso a datos y funciones compartidas entre componentes sin pasar props
 */
// React y bibliotecas de React
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import PropTypes from 'prop-types';

// Bibliotecas externas

// Componentes propios

// Utilidades, servicios y configuración
import ApiService from '../services/apiService';
import CacheService from '../services/cacheService';
import notifications from '../services/notifications';

// Estado inicial
const initialState = {
  asesores: {
    data: [],
    loading: false,
    error: null,
    lastUpdated: null
  },
  uploadStatus: {
    uploading: false,
    progress: 0,
    success: null,
    error: null
  },
  connectivity: {
    isOnline: navigator.onLine,
    serverAvailable: true
  }
};

// Tipos de acciones
const ActionTypes = {
  SET_ASESORES: 'SET_ASESORES',
  ASESORES_LOADING: 'ASESORES_LOADING',
  ASESORES_ERROR: 'ASESORES_ERROR',
  UPLOAD_STARTED: 'UPLOAD_STARTED',
  UPLOAD_PROGRESS: 'UPLOAD_PROGRESS',
  UPLOAD_SUCCESS: 'UPLOAD_SUCCESS',
  UPLOAD_ERROR: 'UPLOAD_ERROR',
  SET_CONNECTIVITY: 'SET_CONNECTIVITY',
  SET_SERVER_AVAILABILITY: 'SET_SERVER_AVAILABILITY'
};

// Reducer para manejar las acciones
const appReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_ASESORES:
      return {
        ...state,
        asesores: {
          ...state.asesores,
          data: action.payload,
          loading: false,
          error: null,
          lastUpdated: new Date()
        }
      };
    case ActionTypes.ASESORES_LOADING:
      return {
        ...state,
        asesores: {
          ...state.asesores,
          loading: true,
          error: null
        }
      };
    case ActionTypes.ASESORES_ERROR:
      return {
        ...state,
        asesores: {
          ...state.asesores,
          loading: false,
          error: action.payload
        }
      };
    case ActionTypes.UPLOAD_STARTED:
      return {
        ...state,
        uploadStatus: {
          uploading: true,
          progress: 0,
          success: null,
          error: null
        }
      };
    case ActionTypes.UPLOAD_PROGRESS:
      return {
        ...state,
        uploadStatus: {
          ...state.uploadStatus,
          progress: action.payload
        }
      };
    case ActionTypes.UPLOAD_SUCCESS:
      return {
        ...state,
        uploadStatus: {
          uploading: false,
          progress: 100,
          success: action.payload,
          error: null
        }
      };
    case ActionTypes.UPLOAD_ERROR:
      return {
        ...state,
        uploadStatus: {
          uploading: false,
          progress: 0,
          success: null,
          error: action.payload
        }
      };
    case ActionTypes.SET_CONNECTIVITY:
      return {
        ...state,
        connectivity: {
          ...state.connectivity,
          isOnline: action.payload
        }
      };
    case ActionTypes.SET_SERVER_AVAILABILITY:
      return {
        ...state,
        connectivity: {
          ...state.connectivity,
          serverAvailable: action.payload
        }
      };
    default:
      return state;
  }
};

// Crear el contexto
const AppContext = createContext();

// Proveedor del contexto
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Acciones disponibles para los componentes
  const actions = {
    // Cargar asesores desde la API
    fetchAsesores: async (forceRefresh = false) => {
      // Verificar si tenemos datos en caché y no estamos forzando un refresh
      const cacheKey = 'asesores_data';
      const cachedData = !forceRefresh ? CacheService.get(cacheKey) : null;
      
      if (cachedData) {
        dispatch({ type: ActionTypes.SET_ASESORES, payload: cachedData });
        return cachedData;
      }
      
      dispatch({ type: ActionTypes.ASESORES_LOADING });
      
      try {
        const result = await ApiService.fetchAsesores();
          if (result.status === 'error') {
          dispatch({ type: ActionTypes.ASESORES_ERROR, payload: result.message });
          return null;
        }
        
        // Extraer los datos correctamente considerando ambas estructuras posibles
        const asesoresData = result.data?.asesores || result.data || [];
        
        // Guardar en caché
        CacheService.set(cacheKey, asesoresData);
        
        dispatch({ type: ActionTypes.SET_ASESORES, payload: asesoresData });
        return asesoresData;
      } catch (error) {
        dispatch({ type: ActionTypes.ASESORES_ERROR, payload: error.message });
        return null;
      }
    },
    
    // Cargar un archivo
    uploadFile: async (formData) => {
      dispatch({ type: ActionTypes.UPLOAD_STARTED });
      
      try {
        // Simular progreso durante la carga (en producción se usaría XMLHttpRequest con onprogress)
        let progress = 0;
        const progressInterval = setInterval(() => {
          const randomIncrement = Math.floor(Math.random() * 15) + 5; // Incremento entre 5% y 20%
          progress = Math.min(progress + randomIncrement, 90); // Máximo 90% hasta completar
          
          dispatch({ type: ActionTypes.UPLOAD_PROGRESS, payload: progress });
        }, 500);
        
        const result = await ApiService.uploadFile(formData);
        
        clearInterval(progressInterval);
        
        if (result.status === 'error') {
          console.error('Error al cargar archivo:', result);
          dispatch({ 
            type: ActionTypes.UPLOAD_ERROR, 
            payload: {
              message: result.message || 'Error al procesar el archivo', 
              errors: result.errors || [],
              details: result.details || {}
            }
          });
          
          notifications.showError(result.message || 'Error al procesar el archivo');
          return result;
        }
        
        dispatch({ type: ActionTypes.UPLOAD_SUCCESS, payload: result });
        
        // Refrescar datos de asesores después de una carga exitosa
        if (result.status === 'success') {
          // Limpiar caché para forzar una recarga
          CacheService.delete('asesores_data');
          await actions.fetchAsesores(true);
          notifications.showResultAlert({
            status: 'success',
            message: 'Archivo procesado exitosamente',
            details: result.data
          });
        }
        
        return result;
      } catch (error) {
        dispatch({ type: ActionTypes.UPLOAD_ERROR, payload: error.message });
        notifications.showError('Error al cargar el archivo');
        return {
          status: 'error',
          message: error.message
        };
      }
    },
    
    // Verificar conectividad con el servidor
    checkServerConnectivity: async () => {
      try {
        const isAvailable = await ApiService.checkConnectivity();
        dispatch({ type: ActionTypes.SET_SERVER_AVAILABILITY, payload: isAvailable });
        return isAvailable;
      } catch (error) {
        dispatch({ type: ActionTypes.SET_SERVER_AVAILABILITY, payload: false });
        return false;
      }
    }
  };

  // Memoizar las acciones para evitar recreación en cada renderizado
  // Las acciones mantienen identidad estable para no reinstalar listeners globales.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedActions = React.useMemo(() => actions, []);

  // Detectar cambios de conectividad
  useEffect(() => {
    const handleOnlineStatus = () => {
      dispatch({ type: ActionTypes.SET_CONNECTIVITY, payload: navigator.onLine });
      
      // Si volvemos a estar online, verificar el servidor
      if (navigator.onLine) {
        memoizedActions.checkServerConnectivity();
      } else {
        dispatch({ type: ActionTypes.SET_SERVER_AVAILABILITY, payload: false });
      }
    };

    // Verificar conectividad inicial - solo una vez al montar el componente
    const checkInitialConnectivity = async () => {
      // Verificamos con un retraso pequeño para evitar bloqueo durante la carga inicial
      setTimeout(async () => {
        await memoizedActions.checkServerConnectivity();
      }, 1000);
    };
    checkInitialConnectivity();
    
    // Agregar event listeners
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    
    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, [memoizedActions]);

  return (
    <AppContext.Provider value={{ state, dispatch, actions: memoizedActions }}>
      {children}
    </AppContext.Provider>
  );
};

// Hook personalizado para usar el contexto
/* eslint-disable react-refresh/only-export-components */
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext debe usarse dentro de un AppProvider');
  }
  return context;
};

AppProvider.propTypes = {
  children: PropTypes.node.isRequired,
};