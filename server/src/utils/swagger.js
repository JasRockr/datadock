/**
 * Configuración de Swagger/OpenAPI para documentación automática de la API
 */
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import config from '../config.js';

// Opciones para la configuración de Swagger
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: config.app.name,
      version: config.app.version,
      description: 'API para la carga y procesamiento de archivos CSV con datos de asesores',
      contact: {
        name: 'Equipo de Desarrollo',
        email: 'desarrollo@example.com',
      },
    },
    servers: [
      {
        url: `http://${config.server.host}:${config.server.port}`,
        description: 'Servidor de desarrollo',
      },
      {
        url: 'https://api.production-server.com',
        description: 'Servidor de producción',
      },
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'error',
            },
            code: {
              type: 'string',
              example: 'ERR_FILE_VALIDATION',
            },
            message: {
              type: 'string',
              example: 'Formato de archivo no admitido',
            },
            details: {
              type: 'object',
              example: {
                originalError: 'Invalid file format',
              },
            },
          },
        },
        Asesor: {
          type: 'object',
          properties: {
            id_asesor: {
              type: 'string',
              example: '1216722322',
            },
            nombre_asesor: {
              type: 'string',
              example: 'Ana Pérez',
            },
            equipo_entidad: {
              type: 'string',
              example: 'Ventas',
            },
            compania: {
              type: 'string',
              example: 'ABC S.A.S.',
            },
            correo_contacto: {
              type: 'string',
              example: 'correo@example.com',
            },
            celular_contacto: {
              type: 'string',
              example: '1234567890',
            },
            rol_asesor: {
              type: 'string',
              example: 'Gerente',
            },
            observaciones: {
              type: 'string',
              example: 'Excelente desempeño en ventas',
            },
            fecha_novedad: {
              type: 'string',
              format: 'date-time',
              example: '2025-04-26T10:00:00Z',
            },
            usuario: {
              type: 'string',
              example: 'admin',
            },
          },
        },
        UploadResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'success',
            },
            message: {
              type: 'string',
              example: 'Archivo procesado correctamente',
            },
            data: {
              type: 'object',
              properties: {
                totalRows: {
                  type: 'integer',
                  example: 100,
                },
                insertedRows: {
                  type: 'integer',
                  example: 98,
                },
                errorsCount: {
                  type: 'integer',
                  example: 2,
                },
                hasErrors: {
                  type: 'boolean',
                  example: true,
                },
                errors: {
                  type: 'array',
                  items: {
                    type: 'object',
                  },
                  example: [
                    {
                      index: 5,
                      error: 'El campo id_asesor es requerido',
                    },
                  ],
                },
              },
            },
          },
        },
      },
      responses: {
        BadRequest: {
          description: 'Parámetros inválidos',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        InternalError: {
          description: 'Error interno del servidor',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  // Archivos con comentarios @swagger (rutas relativas a la carpeta desde la que arranca el servidor: server/)
  apis: ['./src/routes/*.js', './src/domains/*/routes/*.js'],
};

// Generar la especificación de Swagger
const swaggerSpec = swaggerJSDoc(options);

/**
 * Configura el middleware de Swagger para Express
 * @param {Object} app - Instancia de Express 
 * @returns {Object} - Middleware de Swagger configurado
 */
export const setupSwagger = (app) => {
  // Endpoint para la documentación de Swagger
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: `${config.app.name} - API Docs`,
  }));

  // Endpoint para acceder al JSON de la especificación de OpenAPI
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  return swaggerSpec;
};

export default setupSwagger;