import PropTypes from 'prop-types';

/**
 * Componente DataTable
 * 
 * Renderiza una tabla con datos procesados, incluyendo paginación y manejo de celdas seguras.
 * 
 * @component
 * @example
 * return (
 *   <DataTable
 *     data={paginatedData}
 *     columns={columns}
 *     generateUniqueKey={generateUniqueKey}
 *   />
 * )
 */
function DataTable({ data, columns, generateUniqueKey }) {
  return (
    <div className="data-table-container" role="region" aria-label="Tabla de asesores" tabIndex="0">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => <th key={column.id}>{column.header}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? data.map((row, rowIndex) => (
            <tr key={generateUniqueKey(row, rowIndex)}>
              {columns.map((column) => (
                <td key={`${generateUniqueKey(row, rowIndex)}-${column.id}`}>
                  {column.cell ? column.cell(column.accessor(row)) : column.accessor(row)}
                </td>
              ))}
            </tr>
          )) : (
            <tr><td colSpan={columns.length} className="text-center">No se encontraron datos.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

DataTable.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      header: PropTypes.string.isRequired,
      accessor: PropTypes.func.isRequired,
      cell: PropTypes.func,
    })
  ).isRequired,
  generateUniqueKey: PropTypes.func.isRequired,
};

export default DataTable;
