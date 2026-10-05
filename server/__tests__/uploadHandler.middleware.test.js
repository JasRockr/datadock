import { processFile } from '../src/middlewares/uploadHandler.middleware.js';
import { hasValidExtension } from '../src/utils/fileUtils.js';
import { processCsvFile } from '../src/utils/csvHandler.js';
import { FileProcessingError } from '../src/utils/errorHandler.js';

jest.mock('../src/utils/fileUtils.js');
jest.mock('../src/utils/csvHandler.js');

describe('UploadHandler Middleware - processFile', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { file: { originalname: 'test.csv', buffer: Buffer.from('a;b\n1;2') } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  const errorPassedToNext = () => next.mock.calls[0][0];

  it('delega un error 400 si no se proporciona archivo', async () => {
    req.file = undefined;
    await processFile(req, res, next);
    expect(errorPassedToNext()).toMatchObject({
      statusCode: 400,
      errorCode: 'ERR_FILE_VALIDATION',
      message: 'No se proporcionó ningún archivo.',
    });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('delega un error 400 si el archivo no es CSV', async () => {
    hasValidExtension.mockReturnValue(false);
    await processFile(req, res, next);
    expect(errorPassedToNext()).toMatchObject({
      statusCode: 400,
      errorCode: 'ERR_FILE_VALIDATION',
      message: 'Formato de archivo no admitido.',
    });
  });

  it('adjunta las filas procesadas y continúa', async () => {
    hasValidExtension.mockReturnValue(true);
    processCsvFile.mockResolvedValue([{ id_asesor: 1, nombre_asesor: 'Asesor 1' }]);
    await processFile(req, res, next);
    expect(req.dataRows).toEqual([{ id_asesor: 1, nombre_asesor: 'Asesor 1' }]);
    expect(next).toHaveBeenCalledWith();
  });

  it('convierte un CSV inválido en error 400 del cliente', async () => {
    hasValidExtension.mockReturnValue(true);
    processCsvFile.mockRejectedValue(new FileProcessingError('El archivo CSV está vacío'));
    await processFile(req, res, next);
    expect(errorPassedToNext()).toMatchObject({
      statusCode: 400,
      errorCode: 'ERR_FILE_VALIDATION',
      message: 'El archivo CSV está vacío',
    });
  });

  it('propaga errores inesperados sin alterarlos', async () => {
    hasValidExtension.mockReturnValue(true);
    const unexpected = new Error('Fallo inesperado');
    processCsvFile.mockRejectedValue(unexpected);
    await processFile(req, res, next);
    expect(errorPassedToNext()).toBe(unexpected);
  });
});
