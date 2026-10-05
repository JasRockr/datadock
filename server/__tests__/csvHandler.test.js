import { processCsvFile } from '../src/utils/csvHandler.js';
import { FileProcessingError } from '../src/utils/errorHandler.js';

const csvFile = (text, originalname = 'asesores.csv') => ({ originalname, buffer: Buffer.from(text, 'utf8') });

describe('processCsvFile', () => {
  it('conserva todos los valores como texto, sin convertirlos a fecha, número o booleano', async () => {
    const [row] = await processCsvFile(csvFile(
      'id_asesor;nombre_asesor;equipo_entidad;rol_asesor;celular_contacto\n0012345678;Si;Ventas 2;Asesor 1;0312345678',
    ));

    expect(row).toEqual({
      id_asesor: '0012345678',
      nombre_asesor: 'Si',
      equipo_entidad: 'Ventas 2',
      rol_asesor: 'Asesor 1',
      celular_contacto: '0312345678',
    });
  });

  it('normaliza la cabecera: minúsculas, sin comillas y espacios como guion bajo', async () => {
    const [row] = await processCsvFile(csvFile('"Nombre Asesor";ID_ASESOR\nAna;1234567'));
    expect(Object.keys(row)).toEqual(['nombre_asesor', 'id_asesor']);
  });

  it('detecta el separador coma cuando no se fuerza uno', async () => {
    const [row] = await processCsvFile(csvFile('id_asesor,nombre_asesor,compania\n1234567,Ana,ABC'), { delimiter: null });
    expect(row).toEqual({ id_asesor: '1234567', nombre_asesor: 'Ana', compania: 'ABC' });
  });

  it('usa el separador forzado aunque el contenido sugiera otro', async () => {
    const [row] = await processCsvFile(csvFile('a;b\n1,5;2'), { delimiter: ';' });
    expect(row).toEqual({ a: '1,5', b: '2' });
  });

  it('quita el BOM de Excel y omite líneas vacías', async () => {
    const rows = await processCsvFile(csvFile('﻿id_asesor;nombre_asesor\n\n1234567;Ana\n\n'));
    expect(rows).toEqual([{ id_asesor: '1234567', nombre_asesor: 'Ana' }]);
  });

  it('rechaza un CSV sin filas de datos', async () => {
    await expect(processCsvFile(csvFile('id_asesor;nombre_asesor\n'))).rejects.toBeInstanceOf(FileProcessingError);
  });
});
