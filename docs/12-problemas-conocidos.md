# 12. Problemas conocidos y deuda técnica

> Lo que hoy **no funciona bien o falta**, con su impacto y el camino propuesto. Si vas a trabajar cerca de alguno de estos puntos, léelo antes. Cuando corrijas uno, elimínalo de esta lista en el mismo *pull request*.

## 12.1 Sin control de duplicados

- **Prioridad:** 🟠 media
- **Qué pasa:** cargar dos veces el mismo archivo inserta todas las filas dos veces; la tabla no tiene ninguna restricción `UNIQUE`.
- **Qué hay que decidir:** qué identifica a un registro para el negocio (¿`id_asesor`? ¿`id_asesor` + `fecha_novedad`?). Con esa decisión: índice único y `MERGE` en lugar de `INSERT` ([10, sección 10.8](10-guias-de-cambio-y-escalado.md#108-escalar-qué-cambiar-cuando-crezcan-los-datos)).

## 12.2 Sin autenticación

- **Prioridad:** 🟠 media (🔴 alta si la API se expone fuera de la red interna)
- **Qué pasa:** cualquiera con acceso de red a la API puede leer y cargar datos. La columna `usuario` sale del propio CSV, así que no identifica a quien hizo la carga.
- **Camino propuesto:** [10, sección 10.9](10-guias-de-cambio-y-escalado.md#109-agregar-autenticación-cuando-se-necesite).

## 12.3 El lector de CSV no soporta separadores dentro de comillas

- **Prioridad:** 🟢 baja
- **Qué pasa:** `csvHandler.js` separa cada línea con `split(delimitador)`. Un valor como `"Pérez; Juan"` se parte en dos columnas, y tampoco se admiten saltos de línea dentro de un valor.
- **Corrección propuesta:** reemplazar el lector propio por una biblioteca probada (`csv-parse`), conservando la regla de entregar todo como texto.

## 12.4 Escalabilidad del listado y de la carga

- **Prioridad:** 🟢 baja mientras haya pocos miles de registros
- **Qué pasa:** `GET /api/asesores` devuelve todas las filas y el navegador filtra y pagina; la carga inserta las filas una por una.
- **Camino propuesto:** [10, sección 10.8](10-guias-de-cambio-y-escalado.md#108-escalar-qué-cambiar-cuando-crezcan-los-datos).

## 12.5 Tipo de texto en la base de datos

- **Prioridad:** 🟢 baja
- **Qué pasa:** el controlador envía los textos como `sql.VarChar`. Si la tabla real usa `VARCHAR` con una *collation* que no cubre `ñ` o las tildes, esos caracteres pueden perderse.
- **Qué hacer:** comprobar la tabla real (`EXEC sp_help 'dbo.asesores_api'`) y, si hace falta, migrar a `NVARCHAR` y usar `sql.NVarChar` en el controlador.

## 12.6 Detalles menores

| Tema | Dónde | Detalle |
| --- | --- | --- |
| Barra de progreso simulada | `context/AppContext.jsx` → `uploadFile` | Avanza sola hasta el 90 %; no refleja el progreso real de la subida. |
| `console.log` en lugar de `logger` | 13 usos en `server/src` (controlador, conexión, utilidades de archivos) | No respetan `LOG_LEVEL` ni se escriben a archivo. Migrarlos a `logger`. |
| HTML en alertas | `services/notifications.js` → `showValidationErrors` | Inserta los mensajes como HTML. Hoy solo recibe mensajes del propio cliente; si algún día recibe texto del servidor o del archivo, hay que escaparlo. |
| Consultas sin endpoint | `database/queries.js` | `getAsesorById`, `deleteAsesor`, `updateAsesorById` y `getTotalAsesores` están preparadas para endpoints futuros. |
| Umbral fijo | `asesores.controller.js` | El 30 % de errores tolerados está fijo en el código (`errorThreshold`). |

## 12.7 Verificaciones pendientes

La prueba de punta a punta local está descrita en [14-prueba-e2e-con-docker.md](14-prueba-e2e-con-docker.md). Falta:

- **Ejecución real del pipeline** de GitHub Actions, incluido el despliegue a Netlify, una vez configurados sus secretos y la variable `VITE_API_URL` ([09, sección 9.4](09-docker-ci-y-despliegue.md#94-integración-continua-githubworkflowsci-cdyml)).

## 12.8 Seguridad

- Los secretos van **solo** en `server/.env`, que git ignora. Nunca en plantillas, código, documentación ni mensajes de commit.
- Antes de cada commit, revisa `git status` y `git diff --staged`.
- Si un secreto llega a confirmarse por error: avisa de inmediato, **cámbialo en el sistema de origen** (por ejemplo, la contraseña en SQL Server) y después retíralo del repositorio. Quitarlo del repositorio no invalida un secreto que ya pudo copiarse.
