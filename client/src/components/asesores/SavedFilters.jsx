import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const STORAGE_KEY = 'datadock.savedFilters';

function readSavedFilters() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function SavedFilters({ currentFilter, onApply }) {
  const [savedFilters, setSavedFilters] = useState(readSavedFilters);
  const [name, setName] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedFilters));
  }, [savedFilters]);

  const saveCurrentFilter = () => {
    const cleanName = name.trim();
    if (!cleanName) return;

    setSavedFilters(previous => [
      ...previous.filter(filter => filter.name !== cleanName),
      { name: cleanName, value: currentFilter },
    ]);
    setName('');
  };

  const deleteFilter = (filterName) => {
    setSavedFilters(previous => previous.filter(filter => filter.name !== filterName));
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded border border-gray-200 bg-gray-50 p-2">
      <label htmlFor="saved-filter-name" className="sr-only">Nombre del filtro</label>
      <input
        id="saved-filter-name"
        value={name}
        onChange={event => setName(event.target.value)}
        placeholder="Nombre del filtro"
        className="min-w-40 rounded border border-gray-300 px-2 py-1 text-xs"
      />
      <button
        type="button"
        onClick={saveCurrentFilter}
        disabled={!name.trim()}
        className="rounded bg-gray-800 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Guardar filtro
      </button>
      {savedFilters.map(filter => (
        <span key={filter.name} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs text-gray-700 shadow-sm">
          <button type="button" onClick={() => onApply(filter.value)}>{filter.name}</button>
          <button type="button" onClick={() => deleteFilter(filter.name)} aria-label={`Eliminar filtro ${filter.name}`}>×</button>
        </span>
      ))}
    </div>
  );
}

SavedFilters.propTypes = {
  currentFilter: PropTypes.shape({
    globalFilter: PropTypes.string.isRequired,
    dateRange: PropTypes.shape({
      start: PropTypes.string,
      end: PropTypes.string,
    }).isRequired,
  }).isRequired,
  onApply: PropTypes.func.isRequired,
};

export default SavedFilters;
