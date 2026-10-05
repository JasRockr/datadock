# DataDock

**Muelle de datos:** ingesta de archivos (CSV) a SQL Server con validación por esquema, cargas transaccionales y panel de consulta.

Plataforma web para **cargar datos tabulares desde archivos CSV a SQL Server** con validación por esquema, cargas transaccionales con tolerancia a errores y un panel de consulta con búsqueda, filtros por fecha, filtros guardados y exportación a CSV/JSON. Cada tipo de dato se define como un **dominio** independiente (modelo, validación, rutas y vistas); el proyecto incluye el dominio *asesores* como implementación de referencia. Cómo añadir un dominio: [docs/10, sección 10.4](docs/10-guias-de-cambio-y-escalado.md#104-agregar-una-entidad-de-negocio-nueva-un-dominio).

| Pieza | Carpeta | Tecnología | Puerto (desarrollo) |
| --- | --- | --- | --- |
| Cliente | [`client/`](client/) | React 18 + Vite 4 + Tailwind CSS 3 | `5173` |
| Servidor (API) | [`server/`](server/) | Node.js + Express 4 + mssql | `5128` |
| Base de datos | *(externa)* | SQL Server / Azure SQL | `1433` |

## Documentación

**Toda la documentación está en [`docs/`](docs/README.md)**, con una ruta de lectura para quien llega nuevo al equipo:

1. [Visión general y arquitectura](docs/01-vision-general-y-arquitectura.md)
2. [Instalación y entorno](docs/02-instalacion-y-entorno.md) (Windows, macOS y Linux)
3. [Configuración](docs/03-configuracion.md)
4. [Backend](docs/04-backend.md)
5. [Frontend](docs/05-frontend.md)
6. [Base de datos](docs/06-base-de-datos.md)
7. [API](docs/07-api.md)
8. [Pruebas y calidad](docs/08-pruebas-y-calidad.md)
9. [Docker, CI y despliegue](docs/09-docker-ci-y-despliegue.md)
10. [Guías de cambio y escalado](docs/10-guias-de-cambio-y-escalado.md)
11. [Solución de problemas](docs/11-solucion-de-problemas.md)
12. [Problemas conocidos](docs/12-problemas-conocidos.md)
13. [Inventario de archivos](docs/13-inventario-de-archivos.md)
14. [Prueba E2E con Docker](docs/14-prueba-e2e-con-docker.md)

## Inicio rápido

Requisitos: **Node.js 22 LTS**, npm, git y acceso a un SQL Server (detalles en [02-instalacion-y-entorno.md](docs/02-instalacion-y-entorno.md)).

```bash
# 1. Instalar dependencias de raíz, cliente y servidor (versiones exactas de los lockfiles)
npm run ci-all
```

```bash
# 2. Crear la configuración del servidor y completar los datos de la base de datos
cp server/.env.example server/.env                 # bash / zsh
Copy-Item server\.env.example server\.env          # PowerShell
copy server\.env.example server\.env               # CMD
```

```bash
# 3. Arrancar cliente y servidor
npm run dev
```

- Cliente: <http://localhost:5173>
- API: <http://localhost:5128/api/asesores>
- Salud: <http://localhost:5128/health>
- Swagger (solo en desarrollo): <http://localhost:5128/api-docs>

## Scripts (desde la raíz)

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Cliente y servidor con recarga automática |
| `npm run client` / `npm run server` | Solo uno de los dos |
| `npm test` | Pruebas del servidor (Jest) y del cliente (Vitest) |
| `npm run lint` / `npm run lint:fix` | Revisa (y corrige) el estilo del código |
| `npm run build` | Compila `server/dist` y `client/dist` |
| `npm start` | Arranca el servidor compilado |
| `npm run ci-all` | Instalación limpia desde los lockfiles (la que usa el CI) |
| `npm run install-all` | Instalación que puede actualizar los lockfiles |

## Estado del proyecto

Antes de trabajar en el listado, la carga de CSV o el despliegue, revisa [docs/12-problemas-conocidos.md](docs/12-problemas-conocidos.md): contiene errores verificados, con su impacto y la corrección propuesta.

## Licencia

ISC
