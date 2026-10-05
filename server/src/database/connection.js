/**
 * Módulo para la gestión de conexiones a la base de datos SQL Server
 * @module database/connection
 */
import sql from 'mssql';
import config from '../config.js';
import { DatabaseError } from '../utils/errorHandler.js';

// Pool de conexiones global para reutilización
let globalPool = null;

// Configuración de la conexión a la base de datos utilizando la configuración centralizada
const dbSettings = {
  user: config.database.user,
  password: config.database.password,
  server: config.database.server,
  database: config.database.database,
  port: config.database.port,
  options: config.database.options,
  pool: config.database.pool,
};

/**
 * Obtiene una conexión del pool de conexiones a la base de datos
 * @returns {Promise<sql.ConnectionPool>} - Pool de conexiones a la base de datos
 * @throws {DatabaseError} - Si hay un error al conectar a la base de datos
 */
export async function getConnection() {
  try {
    // Si ya existe una conexión en el pool, reutilizarla
    if (globalPool && !globalPool.closed) {
      return globalPool;
    }
    
    // Crear una nueva conexión
    globalPool = await sql.connect(dbSettings);
    
    // Verificar que la conexión funciona con una consulta simple
    await globalPool.request().query('SELECT 1 AS connected');
    
    console.log('Conectado a SQL Server');
    return globalPool;
  } catch (error) {
    console.error('Error al conectar a la base de datos:', error.message);
    
    // Liberar recursos si la conexión falló
    if (globalPool) {
      try {
        await globalPool.close();
      } catch (closeError) {
        console.error('Error al cerrar la conexión fallida:', closeError.message);
      }
      globalPool = null;
    }
    
    throw new DatabaseError(`Error al conectar a la base de datos: ${error.message}`, {
      originalError: error.message,
      server: config.database.server,
      database: config.database.database
    });
  }
}

/**
 * Cierra la conexión a la base de datos
 * @returns {Promise<void>}
 */
export async function closeConnection() {
  if (globalPool) {
    try {
      await globalPool.close();
      globalPool = null;
      console.log('Conexión a SQL Server cerrada');
    } catch (error) {
      console.error('Error al cerrar la conexión:', error.message);
      throw new DatabaseError(`Error al cerrar la conexión: ${error.message}`);
    }
  }
}

/**
 * Ejecuta una transacción en la base de datos con manejo automático de errores
 * @param {Function} callback - Función que recibe una transacción y ejecuta operaciones
 * @returns {Promise<any>} - Resultado de la transacción
 * @throws {DatabaseError} - Si hay un error durante la transacción
 */
export async function executeTransaction(callback) {
  const pool = await getConnection();

  const transaction = new sql.Transaction(pool);
  
  try {
    await transaction.begin();
    
    const result = await callback(transaction);
    
    await transaction.commit();
    return result;
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      console.error('Error al hacer rollback de la transacción:', rollbackError.message);
    }
    
    throw new DatabaseError(`Error en la transacción: ${error.message}`, {
      originalError: error.message
    });
  }
}

export { sql };
