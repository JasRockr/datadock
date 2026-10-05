import request from 'supertest';

jest.mock('../src/database/index.js');

const ALLOWED_ORIGIN = 'http://localhost:5173';

// La configuración se lee al importar la app; se carga aislada con el entorno de cada caso
const loadApp = (env = {}) => {
  const previous = { ...process.env };
  Object.assign(process.env, env);
  let app;
  jest.isolateModules(() => {
    app = require('../src/app.js').default;
  });
  process.env = previous;
  return app;
};

describe('Health y rutas base', () => {
  const app = loadApp();

  it('GET /health responde UP', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'UP' });
  });

  it('GET /status-server responde 200 (healthcheck Docker)', async () => {
    const response = await request(app).get('/status-server');
    expect(response.status).toBe(200);
  });

  it('publica en /api-docs.json los endpoints documentados con sus referencias resueltas', async () => {
    const response = await request(app).get('/api-docs.json');
    expect(response.status).toBe(200);

    const spec = response.body;
    expect(Object.keys(spec.paths)).toEqual(expect.arrayContaining(['/api/asesores', '/api/upload', '/health', '/status-server']));

    const refs = JSON.stringify(spec).match(/#\/components\/[\w/]+/g) || [];
    for (const ref of new Set(refs)) {
      const [, , section, name] = ref.split('/');
      expect(spec.components[section]?.[name]).toBeDefined();
    }
  });

  it('una ruta inexistente responde 404 con el contrato de error', async () => {
    const response = await request(app).get('/api/no-existe');
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      status: 'error',
      code: 'ERR_NOT_FOUND',
      message: 'Ruta no encontrada - /api/no-existe',
    });
  });
});

describe('CORS', () => {
  const app = loadApp({ CORS_ENABLED: 'true', CORS_ORIGIN: ALLOWED_ORIGIN });

  it('permite el origen configurado', async () => {
    const response = await request(app).get('/health').set('Origin', ALLOWED_ORIGIN);
    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
  });

  it('responde el preflight del origen configurado', async () => {
    const response = await request(app)
      .options('/api/upload')
      .set('Origin', ALLOWED_ORIGIN)
      .set('Access-Control-Request-Method', 'POST');
    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-methods']).toContain('POST');
  });

  it('rechaza con 403 un origen no permitido', async () => {
    const response = await request(app).get('/health').set('Origin', 'http://evil.example');
    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ status: 'error', code: 'ERR_CORS' });
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('no emite cabeceras CORS cuando CORS_ENABLED=false', async () => {
    const disabledApp = loadApp({ CORS_ENABLED: 'false' });
    const response = await request(disabledApp).get('/health').set('Origin', ALLOWED_ORIGIN);
    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('respeta CORS_CREDENTIALS', async () => {
    const withCredentials = await request(app).get('/health').set('Origin', ALLOWED_ORIGIN);
    expect(withCredentials.headers['access-control-allow-credentials']).toBe('true');

    const noCredentialsApp = loadApp({ CORS_ENABLED: 'true', CORS_ORIGIN: ALLOWED_ORIGIN, CORS_CREDENTIALS: 'false' });
    const response = await request(noCredentialsApp).get('/health').set('Origin', ALLOWED_ORIGIN);
    expect(response.headers['access-control-allow-credentials']).toBeUndefined();
  });
});
