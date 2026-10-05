import { Asesor, asesorMappingSchema } from '../src/domains/asesores/models/asesor.model.js';
import { mapDataToSchema } from '../src/utils/dataUtils.js';

// Fila tal como la entrega processCsvFile: todo texto
const csvRow = (overrides = {}) => ({
  id_asesor: '1216722322',
  nombre_asesor: 'Ana Pérez',
  equipo_entidad: 'Ventas',
  compania: 'ABC S.A.S.',
  correo_contacto: '',
  celular_contacto: '',
  rol_asesor: '',
  observaciones: '',
  fecha_novedad: '2024-01-15',
  usuario: 'admin',
  ...overrides,
});

const toAsesor = row => {
  const asesor = new Asesor(mapDataToSchema(row, asesorMappingSchema));
  asesor.sanitize();
  return asesor;
};

describe('Mapeo y validación del asesor', () => {
  it('guarda los opcionales vacíos como null (transform del esquema de mapeo)', () => {
    const data = toAsesor(csvRow()).toDatabase();
    expect(data.correo_contacto).toBeNull();
    expect(data.celular_contacto).toBeNull();
    expect(data.rol_asesor).toBeNull();
    expect(data.observaciones).toBeNull();
  });

  it('conserva textos que parecen fechas, números o booleanos', () => {
    const data = toAsesor(csvRow({ nombre_asesor: 'Si', equipo_entidad: 'Ventas 2', id_asesor: '0012345678' })).toDatabase();
    expect(data).toMatchObject({ nombre_asesor: 'Si', equipo_entidad: 'Ventas 2', id_asesor: '0012345678' });
  });

  it('convierte fecha_novedad a Date y usa la fecha actual si viene vacía (default del esquema)', () => {
    expect(toAsesor(csvRow()).fecha_novedad.toISOString()).toBe('2024-01-15T00:00:00.000Z');

    const before = Date.now();
    const sinFecha = toAsesor(csvRow({ fecha_novedad: '' }));
    expect(sinFecha.fecha_novedad.getTime()).toBeGreaterThanOrEqual(before);
    expect(sinFecha.validate().error).toBeUndefined();
  });

  it('rechaza una fecha inválida en lugar de reemplazarla por la fecha actual', () => {
    const { error } = toAsesor(csvRow({ fecha_novedad: '15/31/2024' })).validate();
    expect(error?.message).toMatch(/fecha_novedad/);
  });

  it.each(['persona@empresa.co', 'persona@institucion.edu.co', 'persona@empresa.com'])(
    'acepta el correo %s',
    correo => {
      expect(toAsesor(csvRow({ correo_contacto: correo })).validate().error).toBeUndefined();
    },
  );

  it('rechaza un correo mal formado', () => {
    expect(toAsesor(csvRow({ correo_contacto: 'no-es-correo' })).validate().error?.message).toMatch(/correo_contacto/);
  });

  it('exige los campos obligatorios', () => {
    expect(() => mapDataToSchema(csvRow({ usuario: '' }), asesorMappingSchema)).toThrow('Error en la validación de datos');
  });
});
