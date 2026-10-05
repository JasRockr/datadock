import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AsesoresPage from '../src/pages/AsesoresPage';

const fetchAsesores = vi.fn();

vi.mock('../src/context/AppContext', () => ({
  useAppContext: () => ({
    state: {
      asesores: {
        data: [
          { id_asesor: '1216722322', nombre_asesor: 'Ana Pérez', equipo_entidad: 'Ventas', compania: 'ABC', fecha_novedad: '2024-01-15T00:00:00.000Z' },
          { id_asesor: '1216722323', nombre_asesor: 'Luis Gómez', equipo_entidad: 'Soporte', compania: 'ABC', fecha_novedad: '2024-02-01T00:00:00.000Z' },
        ],
        loading: false,
        error: null,
        lastUpdated: null,
      },
      connectivity: { isOnline: true, serverAvailable: true },
    },
    actions: { fetchAsesores },
  }),
}));

vi.mock('../src/services/notifications', () => ({ default: { showSuccess: vi.fn(), showError: vi.fn() } }));

describe('AsesoresPage', () => {
  let consoleError;

  beforeEach(() => {
    localStorage.clear();
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  const reactWarnings = () => consoleError.mock.calls.map(call => String(call[0])).join('\n');

  it('muestra los asesores del contexto sin volver a pedirlos', () => {
    render(<AsesoresPage />);

    expect(screen.getByText('Listado de Asesores')).toBeInTheDocument();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('Luis Gómez')).toBeInTheDocument();
    expect(fetchAsesores).not.toHaveBeenCalled();
  });

  it('no entra en un bucle de renders', () => {
    render(<AsesoresPage />);

    expect(reactWarnings()).not.toMatch(/Maximum update depth/);
  });

  it('muestra la fecha de novedad del calendario de la API, no desplazada por la zona horaria', () => {
    render(<AsesoresPage />);

    const fila = screen.getByText('Ana Pérez').closest('tr');
    expect(within(fila).getByText('15/1/2024')).toBeInTheDocument();
  });

  it('filtra con la búsqueda general', () => {
    render(<AsesoresPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar filtros' }));
    fireEvent.change(screen.getByPlaceholderText('ID, nombre, equipo o compañía'), { target: { value: 'soporte' } });

    expect(screen.queryByText('Ana Pérez')).not.toBeInTheDocument();
    expect(screen.getByText('Luis Gómez')).toBeInTheDocument();
  });
});
