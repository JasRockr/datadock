import PropTypes from 'prop-types';
import notifications from '../../services/notifications';

const escapeCsvValue = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

function ExportData({ data, columns, filename = 'asesores' }) {
  const download = (content, type, extension) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const header = columns.map(column => escapeCsvValue(column.header)).join(';');
    const rows = data.map(item => columns
      .map(column => escapeCsvValue(column.accessor(item)))
      .join(';'));

    download([header, ...rows].join('\r\n'), 'text/csv;charset=utf-8', 'csv');
    notifications.showSuccess(`${data.length} registros exportados a CSV`);
  };

  const exportJson = () => {
    const rows = data.map(item => columns.reduce((result, column) => ({
      ...result,
      [column.header]: column.accessor(item),
    }), {}));

    download(JSON.stringify(rows, null, 2), 'application/json;charset=utf-8', 'json');
    notifications.showSuccess(`${data.length} registros exportados a JSON`);
  };

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={exportCsv}
        disabled={data.length === 0}
        className="inline-flex items-center rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Exportar CSV
      </button>
      <button
        type="button"
        onClick={exportJson}
        disabled={data.length === 0}
        className="inline-flex items-center rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Exportar JSON
      </button>
    </div>
  );
}

ExportData.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  columns: PropTypes.arrayOf(PropTypes.shape({
    header: PropTypes.string.isRequired,
    accessor: PropTypes.func.isRequired,
  })).isRequired,
  filename: PropTypes.string,
};

export default ExportData;
