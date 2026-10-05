/**
 * Rutas de estado del servidor (no pertenecen a ningún dominio de negocio).
 * /status-server lo usan los healthchecks de Docker; /health, los monitores y el cliente.
 */
import { Router } from 'express';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Estado
 *     description: Comprobaciones de disponibilidad del servidor (no consultan la base de datos)
 */

router.get('/', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Server is running' });
});

router.get('/api', (req, res) => {
  res.status(200).json({ message: 'Welcome to Api!' });
});

/**
 * @swagger
 * /status-server:
 *   get:
 *     summary: Healthcheck usado por Docker
 *     tags: [Estado]
 *     responses:
 *       200:
 *         description: El proceso responde
 */
router.get('/status-server', (req, res) => {
  res.status(200).json({ message: 'Server Online ...' });
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Salud del proceso
 *     tags: [Estado]
 *     responses:
 *       200:
 *         description: El proceso responde
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: UP }
 */
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

export default router;
