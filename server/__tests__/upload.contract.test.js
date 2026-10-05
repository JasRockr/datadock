import request from 'supertest';
import app from '../src/app.js';
import { getConnection, sql } from '../src/database/index.js';
import { saveAsJson } from '../src/utils/fileUtils.js';

jest.mock('../src/database/index.js', () => {
  const Transaction = jest.fn();
  const Request = jest.fn();
  return {
    getConnection: jest.fn(),
    queriesAsesores: { addNewAsesor: 'INSERT', getAllAsesores: 'SELECT' },
    sql: {
      Transaction, Request,
      DateTime: 'DateTime', Float: 'Float', Bit: 'Bit', VarChar: 'VarChar',
    },
  };
});

// Mantener la validación real de extensiones; evitar escribir JSON en disco
jest.mock('../src/utils/fileUtils.js', () => ({
  ...jest.requireActual('../src/utils/fileUtils.js'),
  saveAsJson: jest.fn().mockResolvedValue(undefined),
}));

const HEADER = 'id_asesor;nombre_asesor;equipo_entidad;compania;correo_contacto;celular_contacto;rol_asesor;observaciones;fecha_novedad;usuario';
const validRow = id => `${id};Ana Pérez;Ventas;ABC S.A.S.;ana@example.com;3123456789;Asesor;Sin novedad;2024-01-15;admin`;
const invalidRow = id => `${id};;;;;;;;;x`;

const csv = rows => Buffer.from([HEADER, ...rows].join('\n'), 'utf8');

const expectErrorContract = (response, status, code) => {
  expect(response.status).toBe(status);
  expect(response.body).toMatchObject({ status: 'error', code, message: expect.any(String) });
};

describe('POST /api/upload (multipart real)', () => {
  let transaction;
  let dbRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    transaction = {
      begin: jest.fn().mockResolvedValue(),
      commit: jest.fn().mockResolvedValue(),
      rollback: jest.fn().mockResolvedValue(),
    };
    dbRequest = { input: jest.fn(), query: jest.fn().mockResolvedValue({ rowsAffected: [1] }) };
    sql.Transaction.mockImplementation(() => transaction);
    sql.Request.mockImplementation(() => dbRequest);
    getConnection.mockResolvedValue({});
  });

  it('procesa un CSV válido y responde el contrato de éxito', async () => {
    const response = await request(app)
      .post('/api/upload')
      .attach('file', csv([validRow('1216722322'), validRow('1216722323')]), 'asesores.csv');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'success',
      message: 'Archivo procesado correctamente',
      data: { totalRows: 2, insertedRows: 2, errorsCount: 0, hasErrors: false, errors: [] },
    });
    expect(dbRequest.query).toHaveBeenCalledTimes(2);
    expect(transaction.commit).toHaveBeenCalled();
    expect(transaction.rollback).not.toHaveBeenCalled();
    expect(saveAsJson).toHaveBeenCalledWith('asesores.csv', expect.any(Array));
  });

  it('envía a SQL los textos tal cual, sin convertirlos por su aspecto', async () => {
    const row = '0012345678;Si;Ventas 2;ABC S.A.S.;ana@empresa.edu.co;0312345678;Asesor 1;;2024-01-15;admin';
    const response = await request(app).post('/api/upload').attach('file', csv([row]), 'asesores.csv');

    expect(response.status).toBe(200);
    expect(response.body.data.insertedRows).toBe(1);
    const inputs = Object.fromEntries(dbRequest.input.mock.calls.map(([field, type, value]) => [field, { type, value }]));
    expect(inputs.id_asesor).toEqual({ type: sql.VarChar, value: '0012345678' });
    expect(inputs.nombre_asesor.value).toBe('Si');
    expect(inputs.equipo_entidad.value).toBe('Ventas 2');
    expect(inputs.rol_asesor.value).toBe('Asesor 1');
    expect(inputs.celular_contacto.value).toBe('0312345678');
    expect(inputs.observaciones.value).toBeNull();
    expect(inputs.fecha_novedad.type).toBe(sql.DateTime);
    expect(inputs.fecha_novedad.value.toISOString()).toBe('2024-01-15T00:00:00.000Z');
  });

  it('acepta un CSV separado por comas', async () => {
    const commaCsv = Buffer.from([HEADER.replaceAll(';', ','), validRow('1216722322').replaceAll(';', ',')].join('\n'));
    const response = await request(app).post('/api/upload').attach('file', commaCsv, 'asesores.csv');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ totalRows: 1, insertedRows: 1, errorsCount: 0 });
  });

  it('revierte la transacción si más del 30% de las filas son inválidas', async () => {
    const response = await request(app)
      .post('/api/upload')
      .attach('file', csv([validRow('1216722322'), invalidRow('2'), invalidRow('3')]), 'asesores.csv');

    expectErrorContract(response, 400, 'ERR_TOO_MANY_ERRORS');
    expect(response.body.details).toMatchObject({ totalRows: 3, errorsCount: 2 });
    expect(transaction.rollback).toHaveBeenCalled();
    expect(transaction.commit).not.toHaveBeenCalled();
  });

  it('responde 400 si no se envía archivo', async () => {
    const response = await request(app).post('/api/upload').field('otro', 'valor');
    expectErrorContract(response, 400, 'ERR_FILE_VALIDATION');
    expect(getConnection).not.toHaveBeenCalled();
  });

  it('responde 400 si la extensión no es CSV', async () => {
    const response = await request(app)
      .post('/api/upload')
      .attach('file', Buffer.from('hola'), 'notas.txt');
    expectErrorContract(response, 400, 'ERR_FILE_VALIDATION');
    expect(response.body.message).toBe('Formato de archivo no admitido.');
  });

  it('responde 400 si el CSV no tiene filas de datos', async () => {
    const response = await request(app)
      .post('/api/upload')
      .attach('file', csv([]), 'vacio.csv');
    expectErrorContract(response, 400, 'ERR_FILE_VALIDATION');
  });

  it('responde 400 si el campo del archivo no se llama "file"', async () => {
    const response = await request(app)
      .post('/api/upload')
      .attach('documento', csv([validRow('1216722322')]), 'asesores.csv');
    expectErrorContract(response, 400, 'ERR_FILE_VALIDATION');
  });

  it('responde 413 si el archivo supera el límite configurado', async () => {
    const oversized = Buffer.alloc(10 * 1024 * 1024 + 1, 'a');
    const response = await request(app)
      .post('/api/upload')
      .attach('file', oversized, 'grande.csv');
    expectErrorContract(response, 413, 'ERR_FILE_TOO_LARGE');
  });
});
