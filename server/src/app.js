// Dependencias externas
import express from 'express';
import cors from 'cors';

// Configuración
import config from './config.js';

// Middleware y utilidades
import { errorMiddleware, AppError } from './utils/errorHandler.js';
import logger from './utils/logger.js';
import requestLogger from './middlewares/requestLogger.middleware.js';
import setupSwagger from './utils/swagger.js';

// Rutas
import healthRoutes from './routes/health.routes.js';
import asesoresRoutes from './domains/asesores/routes/asesores.routes.js';

const app = express();

// Iniciar el logger
logger.info('Inicializando aplicación...');

// Configuración de CORS más segura para producción
const corsOptions = {
  origin: function (origin, callback) {
    // En desarrollo permitir cualquier origen
    if (config.app.isDev) {
      callback(null, true);
      return;
    }
    
    // En producción verificar contra lista de dominios permitidos
    const allowedOrigins = config.server.cors.origin.split(',');
    
    // Si origin es undefined, es una petición desde el mismo origen o desde curl, postman, etc.
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      logger.warn(`Origen bloqueado por CORS: ${origin}`);
      callback(new AppError('No permitido por CORS', 403, 'ERR_CORS'));
    }
  },
  methods: config.server.cors.methods,
  credentials: config.server.cors.credentials,
  maxAge: 86400 // Cache preflight requests for 1 day (24 hours)
};

// Set
app.set('port', config.server.port);

// Middlewares
if (config.server.cors.enabled) {
  app.use(cors(corsOptions));
}

// Middleware de logging para todas las peticiones
app.use(requestLogger);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configurar Swagger
if (config.app.isDev || config.app.isTest) {
  logger.info('Configurando Swagger para documentación de API...');
  setupSwagger(app);
  logger.info(`Documentación de API disponible en: http://${config.server.host}:${config.server.port}/api-docs`);
}

// Routes
app.use(healthRoutes);
app.use('/api/', asesoresRoutes);

// Middleware para manejar rutas no encontradas
app.use('*', (req, res, next) => {
  next(new AppError(`Ruta no encontrada - ${req.originalUrl}`, 404, 'ERR_NOT_FOUND'));
});

// Manejador de errores centralizado
app.use(errorMiddleware);

// Log cuando la app está lista
logger.info(`Aplicación configurada y lista para ejecutarse en el puerto ${app.get('port')}`);

export default app;
