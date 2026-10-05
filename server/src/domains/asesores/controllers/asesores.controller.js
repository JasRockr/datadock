/**
 * Controlador para la gestión de asesores
 * Maneja las operaciones relacionadas con la entidad Asesores
 */
import { getConnection, sql, queriesAsesores } from '../../../database/index.js';
import { saveAsJson } from '../../../utils/fileUtils.js';
import { mapDataToSchema } from '../../../utils/dataUtils.js';
import { catchAsync, DatabaseError } from '../../../utils/errorHandler.js';
// import config from '../config.js';
import { asesorMappingSchema, Asesor } from '../models/asesor.model.js';

/**
 * Obtiene todos los asesores
 * @route GET /api/asesores
 */
export const getAllAsesores = catchAsync(async (req, res) => {
  const pool = await getConnection();
  const result = await pool.request().query(queriesAsesores.getAllAsesores);
  
  // Transformar resultados a instancias del modelo Asesor
  const asesores = result.recordset.map(record => new Asesor(record));
  
  res.json({
    status: 'success',
    data: asesores
  });
});

/**
 * Procesa un archivo CSV y carga los asesores en la base de datos
 * @route POST /api/upload
 */
export const uploadAsesores = catchAsync(async (req, res) => {
  // Obtener los datos procesados del archivo
  const dataRows = req.dataRows;
  const file = req.file;
  
  if (!dataRows || !Array.isArray(dataRows) || dataRows.length === 0) {
    return res.status(400).json({
      status: 'error',
      code: 'ERR_NO_DATA',
      message: 'No hay datos para procesar'
    });
  }
  
  // Obtener conexión a la base de datos
  const pool = await getConnection();
  
  // Crear una transacción para asegurar integridad
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  
  try {
    // Contador de registros insertados
    let insertedCount = 0;
    let errorCount = 0;
    const errorDetails = [];
      // Procesar cada fila de datos
    for (const [index, row] of dataRows.entries()) {
      try {
        // Mapear datos según el esquema usando el método de mapDataToSchema
        const mappedData = mapDataToSchema(row, asesorMappingSchema);
        
        // Crear instancia del modelo Asesor
        const asesorInstance = new Asesor(mappedData);
        
        // Sanitizar datos para prevenir inyecciones
        asesorInstance.sanitize();
        
        // Validar datos con el esquema Joi
        const { error } = asesorInstance.validate();
        if (error) {
          throw new Error(`Error de validación: ${error.message}`);
        }
        
        // Obtener datos para la base de datos
        const processedData = asesorInstance.toDatabase();
        
        // Preparar y ejecutar la consulta
        const request = new sql.Request(transaction);
        
        // Añadir parámetros a la consulta
        Object.keys(processedData).forEach(field => {
          const value = processedData[field];
          let sqlType;
          
          // Determinar el tipo SQL apropiado
          if (value instanceof Date) {
            sqlType = sql.DateTime;
          } else if (typeof value === 'number') {
            sqlType = sql.Float;
          } else if (typeof value === 'boolean') {
            sqlType = sql.Bit;
          } else {
            sqlType = sql.VarChar;
          }
          
          request.input(field, sqlType, value);
        });
        
        // Ejecutar la consulta
        await request.query(queriesAsesores.addNewAsesor);
        insertedCount++;
        console.log(`Registro insertado: ${processedData.id_asesor}`);
      } catch (error) {
        errorCount++;
        errorDetails.push({
          index,
          row,
          error: error.message
        });
        console.error(`Error al procesar fila ${index}:`, error.message);
      }
    }
    
    // Si hay demasiados errores, revertir toda la transacción
    const errorThreshold = 0.3; // 30% de errores tolerados
    if (errorCount > 0 && errorCount / dataRows.length > errorThreshold) {
      await transaction.rollback();
      
      return res.status(400).json({
        status: 'error',
        code: 'ERR_TOO_MANY_ERRORS',
        message: `Demasiados errores al procesar el archivo (${errorCount} de ${dataRows.length})`,
        details: {
          totalRows: dataRows.length,
          errorsCount: errorCount,
          errors: errorDetails.slice(0, 10) // Mostrar solo los primeros 10 errores
        }
      });
    }
    
    // Si llegamos aquí, confirmar la transacción
    await transaction.commit();
    
    // Guardar copia de los datos como JSON
    if (file) {
      await saveAsJson(file.originalname, dataRows);
    }
      return res.status(200).json({
      status: 'success',
      message: 'Archivo procesado correctamente',
      data: {
        totalRows: dataRows.length,
        insertedRows: insertedCount,
        errorsCount: errorCount,
        hasErrors: errorCount > 0,
        errors: errorDetails.slice(0, 10) // Mostrar solo los primeros 10 errores
      }
    });
  } catch (error) {
    // En caso de error general, revertir la transacción
    await transaction.rollback();
    
    throw new DatabaseError(`Error al procesar los datos: ${error.message}`, {
      originalError: error.message,
      file: file?.originalname
    });
  }
  // Eliminar el bloque finally que cerraba la conexión
  // La conexión debe ser manejada por el pool global
});
