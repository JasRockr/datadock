import request from 'supertest';
import app from '../src/app.js';
import { jest } from '@jest/globals';
import { getConnection } from '../src/database/index.js';

jest.mock('../src/database/index.js');

describe('Asesores Controller', () => {
  it('should get all asesores', async () => {
    const mockPool = {
      request: jest.fn().mockReturnThis(),
      query: jest.fn().mockResolvedValue({
        recordset: [
          { id_asesor: 1, nombre_asesor: 'Asesor 1', equipo_entidad: 'Equipo 1', compania: 'Compania 1' },
          { id_asesor: 2, nombre_asesor: 'Asesor 2', equipo_entidad: 'Equipo 2', compania: 'Compania 2' },
        ],
      }),
    };
    getConnection.mockResolvedValue(mockPool);

    const response = await request(app).get('/api/asesores');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id_asesor: 1, nombre_asesor: 'Asesor 1', equipo_entidad: 'Equipo 1', compania: 'Compania 1' }),
      expect.objectContaining({ id_asesor: 2, nombre_asesor: 'Asesor 2', equipo_entidad: 'Equipo 2', compania: 'Compania 2' }),
    ]));
  });

  it('should return 500 if there is a database error', async () => {
    getConnection.mockRejectedValue(new Error('Database error'));

    const response = await request(app).get('/api/asesores');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      status: 'error',
      code: 'ERR_INTERNAL',
      message: 'Error interno del servidor',
    });
  });
});
