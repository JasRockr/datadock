/**
 * Filtrado, orden y formato de fechas para las tablas de datos.
 * Son funciones puras: la página las llama dentro de useMemo, sin estado ni efectos.
 */

const pad = (value) => String(value).padStart(2, '0');

/**
 * Convierte una fecha en su clave de día "AAAA-MM-DD".
 * - Texto (lo que envía la API, p. ej. "2024-01-15T00:00:00.000Z"): se toma el día escrito,
 *   porque SQL Server guarda la fecha sin zona horaria y la API la expresa en UTC.
 * - Date (lo que entrega el selector de fechas, a medianoche local): se toma el día local.
 * @param {string|Date|null|undefined} value
 * @returns {string|null}
 */
export const toDayKey = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value));
  return match ? match[1] : null;
};

/**
 * Formatea una fecha de la API como "D/M/AAAA" sin desplazarla por la zona horaria local.
 * @param {string|Date|null|undefined} value
 * @returns {string}
 */
export const formatDay = (value) => {
  const key = toDayKey(value);
  if (!key) return '-';
  const [year, month, day] = key.split('-').map(Number);
  return `${day}/${month}/${year}`;
};

/**
 * Aplica búsqueda global, rango de fechas (sobre fecha_novedad) y orden.
 * @param {Array<Object>} data - Filas a procesar (no se modifica)
 * @param {Object} options
 * @param {Array<{id: string, accessor: Function}>} options.columns - Columnas donde buscar y ordenar
 * @param {string} [options.globalFilter] - Texto a buscar en todas las columnas
 * @param {{start: Date|null, end: Date|null}} [options.dateRange] - Días límite, incluidos
 * @param {{key: string, direction: 'asc'|'desc'}} [options.sort] - Orden opcional
 * @returns {Array<Object>} Nuevo arreglo con las filas resultantes
 */
export const processRows = (data, { columns, globalFilter = '', dateRange = {}, sort } = {}) => {
  let rows = Array.isArray(data) ? [...data] : [];

  const searchTerm = globalFilter.trim().toLowerCase();
  if (searchTerm) {
    rows = rows.filter(row => columns.some(column => {
      const value = column.accessor(row);
      return value !== null && value !== undefined && String(value).toLowerCase().includes(searchTerm);
    }));
  }

  const startKey = toDayKey(dateRange.start);
  const endKey = toDayKey(dateRange.end);
  if (startKey || endKey) {
    rows = rows.filter(row => {
      const rowKey = toDayKey(row.fecha_novedad);
      if (!rowKey) return false;
      // Las claves "AAAA-MM-DD" se ordenan igual como texto que como fecha
      if (startKey && rowKey < startKey) return false;
      if (endKey && rowKey > endKey) return false;
      return true;
    });
  }

  const sortColumn = sort?.key ? columns.find(column => column.id === sort.key) : null;
  if (sortColumn) {
    const direction = sort.direction === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      const aValue = sortColumn.accessor(a) ?? '';
      const bValue = sortColumn.accessor(b) ?? '';
      if (aValue < bValue) return -direction;
      if (aValue > bValue) return direction;
      return 0;
    });
  }

  return rows;
};
