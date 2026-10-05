/**
 * Modelo para la entidad Asesor
 * Define la estructura de datos, validaciones y transformaciones para asesores
 * 
 * @module AsesorModel
 */
import Joi from 'joi';
import { cleanString } from '../../../utils/dataUtils.js';

/**
 * Esquema de validación Joi para un asesor
 * Utilizado para validar datos en las solicitudes API
 */
export const asesorValidationSchema = Joi.object({
  id_asesor: Joi.alternatives()
    .try(
      Joi.string().min(7).max(255),
      Joi.number().integer().positive()
    )
    .required()
    .description(
      'ID del asesor. Puede ser texto o número entero positivo.',
    )
    .example('1216722322'),

  nombre_asesor: Joi.string()
    .min(1)
    .max(255)
    .required()
    .description(
      'Nombre del asesor. Debe ser una cadena no vacía de hasta 255 caracteres.',
    )
    .example('Jhon Doe Smith'),

  equipo_entidad: Joi.string()
    .min(1)
    .max(255)
    .required()
    .description(
      'Equipo o entidad del asesor. Debe ser una cadena no vacía de hasta 255 caracteres.',
    )
    .example('Ventas'),

  compania: Joi.string()
    .min(1)
    .max(255)
    .required()
    .description(
      'Compañía del asesor. Debe ser una cadena no vacía de hasta 255 caracteres.',
    )
    .example('ABC S.A.S.'),

  correo_contacto: Joi.string()
    .email({ minDomainSegments: 2, tlds: { allow: false } }) // cualquier dominio: .co, .edu.co, .com…
    .allow(null, '')
    .optional()
    .description('Correo de contacto del asesor (opcional).')
    .example('correo@example.com'),

  celular_contacto: Joi.string()
    .pattern(/^\d{1,10}$/)
    .allow(null, '')
    .optional()
    .description('Número de celular de contacto del asesor (opcional).')
    .example('3123456789'),

  rol_asesor: Joi.string()
    .allow(null, '')
    .optional()
    .description('Rol del asesor (opcional).')
    .example('Gerente de Ventas'),

  observaciones: Joi.string()
    .allow(null, '')
    .optional()
    .description('Observaciones adicionales (opcional). Texto de humanos para humanos.')
    .example('Excelente desempeño en ventas.'),

  fecha_novedad: Joi.date()
    .max('now')
    .default(() => new Date())
    .description(
      'Fecha de la novedad del asesor. Debe ser una fecha válida no posterior a la fecha actual.',
    )
    .example(new Date().toISOString()),

  usuario: Joi.string()
    .min(3)
    .required()
    .description(
      'Usuario asociado al registro. Debe ser una cadena no vacía de al menos 3 caracteres.',
    )
    .example('user123'),
}).unknown(true); // Permitir campos adicionales no especificados en el esquema

/**
 * Esquema de mapeo para un asesor
 * Define cómo se transforman los datos entre API y base de datos
 */
export const asesorMappingSchema = {
  id_asesor: {
    source: 'id_asesor',
    type: 'string',
    required: true,
    transform: value => cleanString(value?.toString())
  },
  nombre_asesor: {
    source: 'nombre_asesor',
    type: 'string',
    required: true
  },
  equipo_entidad: {
    source: 'equipo_entidad',
    type: 'string',
    required: true
  },
  compania: {
    source: 'compania',
    type: 'string',
    required: true
  },
  correo_contacto: {
    source: 'correo_contacto',
    type: 'string',
    required: false,
    transform: value => value || null
  },
  celular_contacto: {
    source: 'celular_contacto',
    type: 'string',
    required: false,
    transform: value => value || null
  },
  rol_asesor: {
    source: 'rol_asesor',
    type: 'string',
    required: false,
    transform: value => value || null
  },
  observaciones: {
    source: 'observaciones',
    type: 'string',
    required: false,
    transform: value => value || null
  },
  fecha_novedad: {
    source: 'fecha_novedad',
    type: 'date',
    required: false,
    // Solo si viene vacía; una fecha inválida queda en null y la rechaza la validación Joi
    default: () => new Date()
  },
  usuario: {
    source: 'usuario',
    type: 'string',
    required: true
  }
};

/**
 * Clase que representa un Asesor
 */
export class Asesor {
  /**
   * Crea una nueva instancia de Asesor
   * @param {Object} data - Datos para inicializar el asesor
   */
  constructor(data = {}) {
    this.id_asesor = data.id_asesor;
    this.nombre_asesor = data.nombre_asesor;
    this.equipo_entidad = data.equipo_entidad;
    this.compania = data.compania;
    this.correo_contacto = data.correo_contacto;
    this.celular_contacto = data.celular_contacto;
    this.rol_asesor = data.rol_asesor;
    this.observaciones = data.observaciones;
    this.fecha_novedad = data.fecha_novedad === undefined ? new Date() : data.fecha_novedad;
    this.usuario = data.usuario;
  }

  sanitize() {
    const stringFields = [
      'id_asesor',
      'nombre_asesor',
      'equipo_entidad',
      'compania',
      'correo_contacto',
      'celular_contacto',
      'rol_asesor',
      'observaciones',
      'usuario'
    ];

    stringFields.forEach(field => {
      if (this[field] !== null && this[field] !== undefined) {
        this[field] = cleanString(String(this[field]));
      }
    });

    return this;
  }

  validate() {
    return asesorValidationSchema.validate(this, { abortEarly: false });
  }

  /**
   * Convierte la instancia a un formato adecuado para almacenar en la base de datos
   * @returns {Object} Objeto con el formato adecuado para la base de datos
   */
  toDatabase() {
    return {
      id_asesor: this.id_asesor,
      nombre_asesor: this.nombre_asesor,
      equipo_entidad: this.equipo_entidad,
      compania: this.compania,
      correo_contacto: this.correo_contacto,
      celular_contacto: this.celular_contacto,
      rol_asesor: this.rol_asesor,
      observaciones: this.observaciones,
      fecha_novedad: this.fecha_novedad,
      usuario: this.usuario
    };
  }
}
