import { describe, expect, it } from 'vitest';
import { formatDay, processRows, toDayKey } from '../src/utils/dataProcessing';

const columns = [
  { id: 'id_asesor', accessor: row => row.id_asesor },
  { id: 'nombre_asesor', accessor: row => row.nombre_asesor },
  { id: 'fecha_novedad', accessor: row => row.fecha_novedad },
];

// Así llegan las fechas desde la API: medianoche UTC
const rows = [
  { id_asesor: '1', nombre_asesor: 'Ana Pérez', fecha_novedad: '2024-01-15T00:00:00.000Z' },
  { id_asesor: '2', nombre_asesor: 'Luis Gómez', fecha_novedad: '2024-02-01T00:00:00.000Z' },
  { id_asesor: '3', nombre_asesor: 'Sin fecha', fecha_novedad: null },
];

const localDate = (y, m, d) => new Date(y, m - 1, d); // lo que entrega el selector de fechas

describe('toDayKey / formatDay', () => {
  it('usa el día del calendario de la API, no el de la hora local', () => {
    expect(toDayKey('2024-01-15T00:00:00.000Z')).toBe('2024-01-15');
    expect(formatDay('2024-01-15T00:00:00.000Z')).toBe('15/1/2024');
  });

  it('convierte fechas del selector (hora local) a su día local', () => {
    expect(toDayKey(localDate(2024, 1, 15))).toBe('2024-01-15');
  });

  it('devuelve null o "-" para valores vacíos o inválidos', () => {
    expect(toDayKey(null)).toBeNull();
    expect(toDayKey('no-es-fecha')).toBeNull();
    expect(formatDay(undefined)).toBe('-');
  });
});

describe('processRows', () => {
  const base = { columns, globalFilter: '', dateRange: { start: null, end: null } };

  it('sin filtros devuelve todas las filas sin modificar el arreglo original', () => {
    const result = processRows(rows, base);
    expect(result).toHaveLength(3);
    expect(result).not.toBe(rows);
  });

  it('la búsqueda global ignora mayúsculas y revisa todas las columnas', () => {
    expect(processRows(rows, { ...base, globalFilter: 'gómez' }).map(r => r.id_asesor)).toEqual(['2']);
  });

  it('el rango de fechas incluye los días límite completos', () => {
    const result = processRows(rows, { ...base, dateRange: { start: localDate(2024, 1, 15), end: localDate(2024, 1, 15) } });
    expect(result.map(r => r.id_asesor)).toEqual(['1']);
  });

  it('con rango de fechas excluye filas sin fecha', () => {
    const result = processRows(rows, { ...base, dateRange: { start: localDate(2024, 1, 1), end: null } });
    expect(result.map(r => r.id_asesor)).toEqual(['1', '2']);
  });

  it('ordena por la columna indicada', () => {
    const result = processRows(rows, { ...base, sort: { key: 'fecha_novedad', direction: 'desc' } });
    expect(result.map(r => r.id_asesor)).toEqual(['2', '1', '3']);
  });

  it('tolera datos que no son arreglo', () => {
    expect(processRows(undefined, base)).toEqual([]);
  });
});
