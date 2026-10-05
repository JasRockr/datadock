import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CargaArchivoPage from '../src/pages/CargaArchivoPage';
import { useAppContext } from '../src/context/AppContext';
import fileValidator from '../src/utils/fileValidator';

vi.mock('../src/context/AppContext', () => ({
  useAppContext: vi.fn(),
}));

vi.mock('../src/utils/fileValidator', () => ({
  default: {
    validateCsvFile: vi.fn(),
  },
}));

vi.mock('../src/services/notifications', () => ({
  default: {
    showInfo: vi.fn(),
    showError: vi.fn(),
    showValidationErrors: vi.fn(),
  },
}));

vi.mock('react-spinners', () => ({
  BeatLoader: () => <div data-testid="loading-spinner" />,
}));

const createContext = (overrides = {}) => ({
  state: {
    uploadStatus: { uploading: false, progress: 0, success: null, error: null },
    connectivity: { isOnline: true, serverAvailable: true },
    ...overrides.state,
  },
  actions: {
    uploadFile: vi.fn(),
    checkServerConnectivity: vi.fn(),
    ...overrides.actions,
  },
});

describe('CargaArchivoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppContext.mockReturnValue(createContext());
    fileValidator.validateCsvFile.mockResolvedValue({ valid: true, errors: [] });
  });

  it('renders the CSV upload control', () => {
    render(<CargaArchivoPage />);

    expect(screen.getByText('Carga de Archivo CSV')).toBeInTheDocument();
    expect(screen.getByLabelText('Seleccionar archivo')).toBeInTheDocument();
  });

  it('shows the offline status', () => {
    useAppContext.mockReturnValue(createContext({
      state: { connectivity: { isOnline: false, serverAvailable: false } },
    }));

    render(<CargaArchivoPage />);

    expect(screen.getByText(/Sin conexión a Internet/i)).toBeInTheDocument();
  });

  it('sube el archivo si el chequeo de conexión recién hecho es positivo, aunque el estado previo dijera lo contrario', async () => {
    const uploadFile = vi.fn().mockResolvedValue({ status: 'success', data: {} });
    const checkServerConnectivity = vi.fn().mockResolvedValue(true);
    useAppContext.mockReturnValue(createContext({
      state: { connectivity: { isOnline: false, serverAvailable: true } },
      actions: { uploadFile, checkServerConnectivity },
    }));
    render(<CargaArchivoPage />);

    const file = new File(['id_asesor;nombre_asesor'], 'asesores.csv', { type: 'text/csv' });
    fireEvent.change(screen.getByLabelText('Seleccionar archivo'), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole('button', { name: /Cargar Archivo/i })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: /Cargar Archivo/i }));

    await waitFor(() => expect(uploadFile).toHaveBeenCalledTimes(1));
    expect(checkServerConnectivity).toHaveBeenCalled();
  });

  it('validates the selected CSV file with the current validator contract', async () => {
    render(<CargaArchivoPage />);
    const file = new File(['id_asesor;nombre_asesor'], 'asesores.csv', { type: 'text/csv' });

    fireEvent.change(screen.getByLabelText('Seleccionar archivo'), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(fileValidator.validateCsvFile).toHaveBeenCalledWith(file);
    });
  });

  it('renders the upload progress state', () => {
    useAppContext.mockReturnValue(createContext({
      state: { uploadStatus: { uploading: true, progress: 50, success: null, error: null } },
    }));

    render(<CargaArchivoPage />);

    expect(screen.getByText('Procesando archivo')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders the backend processing summary', () => {
    useAppContext.mockReturnValue(createContext({
      state: {
        uploadStatus: {
          uploading: false,
          progress: 100,
          success: {
            status: 'success',
            data: { totalRows: 10, insertedRows: 9, errorsCount: 1, hasErrors: true },
          },
          error: null,
        },
      },
    }));

    render(<CargaArchivoPage />);

    expect(screen.getByText(/Resumen del procesamiento/i)).toBeInTheDocument();
    expect(screen.getByText(/Carga parcial/i)).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });
});
