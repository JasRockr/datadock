import { afterEach, describe, expect, it, vi } from 'vitest';
import ApiService from '../src/services/apiService';
import { API_BASE } from '../src/config';

describe('ApiService.checkConnectivity', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('consulta /health, que no depende de la base de datos', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await expect(ApiService.checkConnectivity()).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/health`, expect.objectContaining({ method: 'GET' }));
  });

  it('devuelve false si el servidor responde con error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(ApiService.checkConnectivity()).resolves.toBe(false);
  });

  it('devuelve false si no hay red', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(ApiService.checkConnectivity()).resolves.toBe(false);
  });
});

describe('ApiService.uploadFile', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('convierte una respuesta de error del servidor en el contrato de error del cliente', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 413,
      statusText: 'Payload Too Large',
      json: () => Promise.resolve({ status: 'error', code: 'ERR_FILE_TOO_LARGE', message: 'El archivo es demasiado grande.' }),
    }));

    const result = await ApiService.uploadFile(new FormData());

    expect(result).toMatchObject({ status: 'error', code: 413, message: 'El archivo es demasiado grande.' });
  });
});
