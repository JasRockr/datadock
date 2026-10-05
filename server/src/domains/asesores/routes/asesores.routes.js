import express from 'express';
import { getAllAsesores, uploadAsesores } from '../controllers/asesores.controller.js';
import { uploadFile, processFile } from '../../../middlewares/uploadHandler.middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Asesores
 *     description: Consulta y carga masiva de asesores
 */

/**
 * @swagger
 * /api/asesores:
 *   get:
 *     summary: Lista todos los asesores
 *     description: Devuelve todos los registros de la tabla, sin paginación ni filtros.
 *     tags: [Asesores]
 *     responses:
 *       200:
 *         description: Lista de asesores
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Asesor' }
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/asesores', getAllAsesores);

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Carga asesores desde un archivo CSV
 *     description: >
 *       CSV en UTF-8 con cabecera. Separador `;` (o el que se detecte si CSV_DELIMITER no está definido).
 *       Obligatorias: id_asesor, nombre_asesor, equipo_entidad, compania, usuario.
 *       Si más del 30 % de las filas son inválidas no se guarda ninguna.
 *     tags: [Asesores]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Archivo .csv (máximo MAX_FILE_SIZE, 10 MB por defecto)
 *     responses:
 *       200:
 *         description: Archivo procesado (puede incluir filas con error si no superan el 30 %)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/UploadResponse' }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       413:
 *         description: El archivo supera MAX_FILE_SIZE (ERR_FILE_TOO_LARGE)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/upload', uploadFile, processFile, uploadAsesores);

export default router;
