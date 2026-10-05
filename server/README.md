# API de DataDock

API REST de DataDock en **Node.js + Express 4**: recibe archivos CSV, los valida contra el esquema de cada dominio (hoy, *asesores*) y los guarda en **SQL Server** en una transacción.

- Documentación completa del servidor: [docs/04-backend.md](../docs/04-backend.md)
- Endpoints y formato del CSV: [docs/07-api.md](../docs/07-api.md)
- Variables de entorno (`server/.env`): [docs/03-configuracion.md](../docs/03-configuracion.md#33-variables-del-servidor-serverenv)
- Base de datos: [docs/06-base-de-datos.md](../docs/06-base-de-datos.md)
- Índice general: [docs/README.md](../docs/README.md)

## Primeros pasos

1. Copia la plantilla de configuración y complétala (`server/.env` no se versiona):
   - bash / zsh: `cp .env.example .env`
   - PowerShell: `Copy-Item .env.example .env`
   - CMD: `copy .env.example .env`
2. Instala dependencias: `npm ci`
3. Arranca en desarrollo: `npm run dev` → <http://localhost:5128/health>

## Comandos (desde esta carpeta)

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | nodemon + babel-node, se reinicia al guardar |
| `npm test` | Pruebas con Jest y Supertest |
| `npm run lint` | ESLint |
| `npm run build` | Compila `src/` a `dist/` con Babel |
| `npm start` | Ejecuta `dist/` (primero `npm run build`) |

Desde la raíz del repositorio también puedes usar `npm run server` o `npm --prefix server <comando>`.
