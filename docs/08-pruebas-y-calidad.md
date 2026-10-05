# 8. Pruebas, lint y convenciones

> Antes de abrir un *pull request*, **`npm run lint` y `npm test` deben terminar sin errores**. El CI ejecuta exactamente esos dos comandos y rechaza el cambio si fallan.

## 8.1 Ejecutar las pruebas

| Comando (desde la raíz) | Qué ejecuta |
| --- | --- |
| `npm test` | Servidor (Jest) y luego cliente (Vitest). Se detiene si el servidor falla. |
| `npm run test:server` | Solo el servidor: `jest --runInBand` (una prueba tras otra, más estable) |
| `npm run test:client` | Solo el cliente: `vitest run` |

Variantes útiles:

```bash
# Un solo archivo de pruebas del servidor
npm --prefix server test -- __tests__/upload.contract.test.js

# Solo las pruebas cuyo nombre contiene un texto
npm --prefix server test -- -t "CORS"

# Cobertura del servidor (genera server/coverage/)
npm --prefix server test -- --coverage
```

Cliente en modo observación (vuelve a ejecutar las pruebas al guardar; `Ctrl+C` para salir):

```bash
cd client
npx vitest
cd ..
```

> Los mensajes `[ERROR] ... Database error` que aparecen al probar el servidor **son esperados**: algunas pruebas simulan fallos a propósito. Lo que importa es la línea final `Tests: N passed`.

## 8.2 Qué pruebas existen

### Servidor: `server/__tests__/` (Jest + Supertest)

| Archivo | Tipo | Qué cubre |
| --- | --- | --- |
| `upload.contract.test.js` | Integración | `POST /api/upload` con archivos *multipart* reales: CSV válido (*commit* y respuesta), textos que llegan a SQL sin alterar, CSV separado por comas, *rollback* con más del 30 % de errores, sin archivo, campo mal nombrado, extensión inválida, CSV vacío y archivo demasiado grande (413). Solo se simula la base de datos. |
| `app.contract.test.js` | Integración | `/health`, `/status-server`, documentación Swagger (endpoints y referencias), 404 y CORS (origen permitido, *preflight*, rechazo con 403, `CORS_ENABLED=false`, `CORS_CREDENTIALS`). |
| `asesores.controller.test.js` | Integración | `GET /api/asesores`: éxito y error de base de datos. |
| `uploadHandler.middleware.test.js` | Unitaria | `processFile`: cada error y el caso correcto, sin Express. |
| `csvHandler.test.js` | Unitaria | El lector conserva los valores como texto, normaliza la cabecera, detecta o fuerza el separador, quita el BOM y rechaza un CSV vacío. |
| `asesor.model.test.js` | Unitaria | Mapeo y validación: opcionales vacíos → `null`, textos intactos, fecha por defecto, fecha inválida rechazada, correos `.co`/`.edu.co`, campos obligatorios. |

**Supertest** envía peticiones HTTP a `app` **sin abrir un puerto**. **`jest.mock(ruta)`** reemplaza un módulo por una versión simulada; así las pruebas no necesitan SQL Server.

### Cliente: `client/__tests__/` (Vitest + Testing Library)

| Archivo | Qué cubre |
| --- | --- |
| `AsesoresPage.test.jsx` | Muestra los asesores del contexto, **no entra en un bucle de renders**, muestra la fecha sin desplazarla por la zona horaria y filtra con la búsqueda general. |
| `CargaArchivoPage.test.jsx` | Control de carga, aviso sin conexión, uso del resultado recién obtenido del chequeo de conexión, validación al elegir archivo, barra de progreso y resumen del procesamiento. |
| `dataProcessing.test.js` | `processRows`, `toDayKey` y `formatDay`: búsqueda, rango de fechas con días límite, orden y valores vacíos. |
| `apiService.test.js` | El chequeo de conexión usa `/health`; conversión de errores del servidor. |
| `setup.js` | Activa los comparadores de `@testing-library/jest-dom` (`toBeInTheDocument`…). |

Las pruebas del cliente corren en **jsdom** (un navegador simulado) con la zona horaria **fija en `America/Bogota`** (`client/vite.config.js`), para que las pruebas de fechas den el mismo resultado en cualquier máquina o en el CI. `useAppContext` se reemplaza con `vi.mock` para controlar el estado.

**Pendiente de cubrir** (buen primer *ticket*): `ExportData`, `SavedFilters`, `DateRangePicker` y `fileValidator`.

## 8.3 Cómo escribir una prueba nueva

### Servidor: un endpoint

```js
// server/__tests__/mi-endpoint.test.js
import request from 'supertest';
import app from '../src/app.js';
import { getConnection } from '../src/database/index.js';

jest.mock('../src/database/index.js');   // nada de SQL Server real

describe('GET /api/mi-endpoint', () => {
  it('responde 200 con el contrato esperado', async () => {
    getConnection.mockResolvedValue({
      request: () => ({ query: jest.fn().mockResolvedValue({ recordset: [] }) }),
    });

    const response = await request(app).get('/api/mi-endpoint');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'success', data: [] });
  });
});
```

### Cliente: un componente

```jsx
// client/__tests__/MiComponente.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MiComponente from '../src/components/MiComponente';

describe('MiComponente', () => {
  it('llama a onClick al pulsar el botón', () => {
    const onClick = vi.fn();
    render(<MiComponente onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(onClick).toHaveBeenCalled();
  });
});
```

**Reglas:**

1. Busca los elementos como los ve el usuario: `getByRole`, `getByLabelText`, `getByText`. Evita buscar por clases CSS.
2. Nunca dependas de una base de datos, de la red o de un archivo real: simúlalos.
3. **No simules el código que estás probando.** Si una prueba reemplaza por uno vacío justo el componente que puede fallar, nunca detectará sus errores.
4. Una prueba comprueba **una** cosa, y su nombre dice cuál.
5. Si corriges un error, primero escribe la prueba que lo reproduce y **comprueba que falla**; luego corrígelo.

## 8.4 Lint (estilo y errores comunes)

```bash
npm run lint       # revisa cliente y servidor
npm run lint:fix   # corrige automáticamente lo que pueda
```

- **Cliente** (`client/.eslintrc.cjs`): reglas recomendadas de ESLint, React y React Hooks. `--max-warnings 0`: cualquier advertencia hace fallar el lint.
- **Servidor** (`server/.eslintrc.cjs`): reglas recomendadas de ESLint para Node, con `jest` habilitado en `__tests__/`.

Si una regla molesta en un caso justificado, desactívala **solo en esa línea** y explica por qué:

```js
// Las acciones mantienen identidad estable; ver AppContext.
// eslint-disable-next-line react-hooks/exhaustive-deps
```

## 8.5 Convenciones del proyecto

### Nombres

| Qué | Convención | Ejemplo |
| --- | --- | --- |
| Páginas React | `PascalCase` + `Page.jsx`, en `pages/` | `AsesoresPage.jsx` |
| Componentes React | `PascalCase.jsx`, en `components/` | `DataTable.jsx` |
| Servicios y utilidades del cliente | `camelCase.js` | `apiService.js`, `dataProcessing.js` |
| Carpetas | minúsculas | `components/asesores/` |
| Archivos del servidor | `nombre.tipo.js` | `asesores.controller.js`, `health.routes.js` |
| Pruebas | `__tests__/<Nombre>.test.js(x)` | `AsesoresPage.test.jsx` |
| Migraciones SQL | `NNN_descripcion.sql` | `001_crear_tabla_asesores_api.sql` |
| Variables y funciones | `camelCase` | `processCsvFile` |
| Constantes | `MAYUSCULAS_CON_GUION` | `MAX_FILE_SIZE` |
| Campos de datos (API y base) | `snake_case`, en español | `nombre_asesor`, `fecha_novedad` |
| Códigos de error | `ERR_MAYUSCULAS` | `ERR_FILE_VALIDATION` |

### Idioma

- Textos para el usuario, mensajes de error, comentarios y nombres de negocio: **español**.
- Los nombres técnicos genéricos pueden ir en inglés (`handleUpload`, `processFile`), como ya ocurre en el código.

### Orden de los imports

```js
// 1. React y bibliotecas de React
import { useState } from 'react';
import PropTypes from 'prop-types';

// 2. Bibliotecas externas
import { BeatLoader } from 'react-spinners';

// 3. Componentes propios
import DataTable from '../components/asesores/DataTable';

// 4. Contexto, servicios, utilidades, configuración y estilos
import { useAppContext } from '../context/AppContext';
import { processRows } from '../utils/dataProcessing';
import './styles.css';
```

### Comentarios

Explica el **porqué**, no el qué. `// Multer en memoria: el CSV nunca toca el disco` es útil; `// llama a la función` no lo es.

## 8.6 Flujo de trabajo con git

1. Actualiza `main`: `git checkout main` y luego `git pull`.
2. Crea una rama: `git checkout -b feat/descripcion-corta` (o `fix/...`, `docs/...`, `test/...`).
3. Haz cambios pequeños y enfocados.
4. Antes de confirmar: `npm run lint` y `npm test`.
5. Mensajes de commit en español, con el formato `tipo(ámbito): descripción`:
   - `feat(client): agregar columna correo a la tabla`
   - `fix(server): rechazar archivos sin filas de datos`
   - Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `build` (dependencias, Docker), `ci`, `chore`.
6. Sube la rama (`git push -u origin feat/descripcion-corta`) y abre un *pull request* hacia `main`.

**Nunca hagas commit de:** `.env`, `node_modules/`, `dist/`, `uploads/`, `tmp/`, archivos con datos reales de personas. Antes de confirmar, revisa `git status` y `git diff --staged`.

## 8.7 Lista de revisión antes del *pull request*

- [ ] `npm run lint` sin errores
- [ ] `npm test` sin errores
- [ ] Pruebas nuevas para lo que agregaste o corregiste
- [ ] Si cambiaste una regla (tamaño, columnas, extensiones), la cambiaste **en el cliente y en el servidor**
- [ ] Si agregaste una variable de entorno: `server/.env.example` y [03-configuracion.md](03-configuracion.md) actualizados
- [ ] Si cambiaste la API: comentario `@swagger` de la ruta y [07-api.md](07-api.md) actualizados
- [ ] Si cambiaste la tabla: nuevo script en `server/database/migrations/`
- [ ] Si cambiaste el modelo, las consultas, la conexión, los Dockerfiles o `docker-compose.yml`: prueba E2E ([14-prueba-e2e-con-docker.md](14-prueba-e2e-con-docker.md))
- [ ] Si agregaste o moviste archivos: [13-inventario-de-archivos.md](13-inventario-de-archivos.md) actualizado
- [ ] Sin `console.log` de depuración olvidados ni datos sensibles en los logs

Siguiente paso: [09-docker-ci-y-despliegue.md](09-docker-ci-y-despliegue.md).
