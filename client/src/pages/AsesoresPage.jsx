import { useEffect, useMemo, useState } from 'react';
import DataTable from '../components/asesores/DataTable';
import PaginationControls from '../components/asesores/PaginationControls';
import ConnectivityStatus from '../components/asesores/ConnectivityStatus';
import ExportData from '../components/asesores/ExportData';
import SavedFilters from '../components/asesores/SavedFilters';
import DateRangePicker from '../components/asesores/DateRangePicker';
import { useAppContext } from '../context/AppContext';
import notifications from '../services/notifications';
import { formatDay, processRows } from '../utils/dataProcessing';

const columns = [
  { id: 'id_asesor', header: 'ID Asesor', accessor: asesor => asesor.id_asesor },
  { id: 'nombre_asesor', header: 'Nombre', accessor: asesor => asesor.nombre_asesor },
  { id: 'equipo_entidad', header: 'Equipo/Entidad', accessor: asesor => asesor.equipo_entidad },
  { id: 'compania', header: 'Compañía', accessor: asesor => asesor.compania },
  {
    id: 'fecha_novedad',
    header: 'Fecha Novedad',
    accessor: asesor => asesor.fecha_novedad,
    cell: formatDay,
  },
];

// Fuera del componente para que su identidad sea estable entre renders
const DEFAULT_SORT = { key: 'fecha_novedad', direction: 'desc' };

function AsesoresPage() {
  const { state, actions } = useAppContext();
  const { data, loading, error, lastUpdated } = state.asesores;
  const asesores = useMemo(() => data?.asesores || data || [], [data]);
  const { isOnline, serverAvailable } = state.connectivity;
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedView, setExpandedView] = useState(true);

  useEffect(() => {
    if (asesores.length === 0) actions.fetchAsesores();
    // actions conserva identidad estable dentro de AppContext.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [globalFilter, dateRange.start, dateRange.end, pageSize]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await actions.fetchAsesores(true);
      notifications.showSuccess('Datos actualizados correctamente');
    } finally {
      setRefreshing(false);
    }
  };

  const clearAllFilters = () => {
    setGlobalFilter('');
    setDateRange({ start: null, end: null });
  };

  const currentFilter = {
    globalFilter,
    dateRange: {
      start: dateRange.start ? new Date(dateRange.start).toISOString() : '',
      end: dateRange.end ? new Date(dateRange.end).toISOString() : '',
    },
  };

  const applySavedFilter = savedFilter => {
    setGlobalFilter(savedFilter.globalFilter || '');
    setDateRange({
      start: savedFilter.dateRange?.start ? new Date(savedFilter.dateRange.start) : null,
      end: savedFilter.dateRange?.end ? new Date(savedFilter.dateRange.end) : null,
    });
  };

  const processedData = useMemo(
    () => processRows(asesores, { columns, globalFilter, dateRange, sort: DEFAULT_SORT }),
    [asesores, globalFilter, dateRange],
  );

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [currentPage, pageSize, processedData]);

  const totalPages = Math.max(1, Math.ceil(processedData.length / pageSize));
  const generateUniqueKey = (item, index) => `${item?.id_asesor || 'unknown'}-${index}`;

  if (loading && !refreshing) {
    return <div className="flex min-h-64 items-center justify-center text-gray-600">Cargando datos...</div>;
  }

  if (error && asesores.length === 0) {
    return (
      <div className="rounded border-l-4 border-red-500 bg-red-100 p-4 text-red-700" role="alert">
        <p className="font-bold">Error</p>
        <p>{error}</p>
        <button type="button" onClick={handleRefresh} className="mt-3 rounded bg-red-500 px-3 py-1 text-sm text-white">Reintentar</button>
      </div>
    );
  }

  return (
    <section className={`w-full transition-all ${expandedView ? '' : 'mx-auto max-w-6xl'}`}>
      <ConnectivityStatus
        isOnline={isOnline}
        serverAvailable={serverAvailable}
        loading={loading}
        refreshing={refreshing}
        error={error}
        onRetry={handleRefresh}
      />
      <div className="rounded-lg bg-white p-3 shadow-sm sm:p-4">
        <header className="flex flex-col gap-3 border-b border-gray-200 pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-gray-800">Listado de Asesores</h2>
              <button type="button" onClick={() => setExpandedView(value => !value)} className="rounded p-1 text-gray-500 hover:bg-gray-100" title="Cambiar ancho de vista">
                {expandedView ? '−' : '⤢'}
              </button>
            </div>
            <p className="text-sm text-gray-600">{processedData.length} registros filtrados{lastUpdated ? ` · Actualizado ${new Date(lastUpdated).toLocaleTimeString()}` : ''}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ExportData data={processedData} columns={columns} />
            <button type="button" onClick={() => setShowFilters(value => !value)} className="rounded border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
              {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
            </button>
            <button type="button" onClick={handleRefresh} disabled={refreshing || !serverAvailable} className="rounded bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50">
              {refreshing ? 'Actualizando...' : 'Actualizar'}
            </button>
            <label className="flex items-center gap-1 text-xs text-gray-600">
              <span className="sr-only">Registros por página</span>
              <select value={pageSize} onChange={event => setPageSize(Number(event.target.value))} className="rounded border border-gray-300 px-2 py-2">
                {[10, 25, 50, 100].map(size => <option key={size} value={size}>{size}/pág.</option>)}
              </select>
            </label>
          </div>
        </header>

        {showFilters && (
          <div className="mt-3 grid gap-3 rounded border border-gray-200 bg-gray-50 p-3 md:grid-cols-2">
            <label className="grid gap-1 text-xs font-medium text-gray-700">
              Búsqueda general
              <input value={globalFilter} onChange={event => setGlobalFilter(event.target.value)} placeholder="ID, nombre, equipo o compañía" className="min-w-0 rounded border border-gray-300 bg-white px-3 py-2 text-sm font-normal" />
            </label>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
        )}

        <div className="mt-3">
          <SavedFilters currentFilter={currentFilter} onApply={applySavedFilter} />
        </div>


        {processedData.length === 0 && !loading ? (
          <div className="py-12 text-center text-sm text-gray-600">
            No se encontraron asesores con los filtros actuales.
            <button type="button" onClick={clearAllFilters} className="ml-2 text-green-700 underline">Limpiar filtros</button>
          </div>
        ) : (
          <>
            <DataTable data={paginatedData} columns={columns} generateUniqueKey={generateUniqueKey} />
            <div className="mt-3 flex flex-col gap-2 text-center text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between sm:text-left">
              <span>Mostrando {Math.min((currentPage - 1) * pageSize + 1, processedData.length)}-{Math.min(currentPage * pageSize, processedData.length)} de {processedData.length}</span>
              <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} onNext={() => setCurrentPage(page => Math.min(page + 1, totalPages))} onPrev={() => setCurrentPage(page => Math.max(page - 1, 1))} />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default AsesoresPage;
