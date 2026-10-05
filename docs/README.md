# Documentación de DataDock

Guía de onboarding y referencia técnica del proyecto. Está escrita para quien llega al equipo **sin conocer el proyecto** y con poca experiencia: no da nada por sentado.

## Ruta de aprendizaje recomendada

Léela en este orden. Los tiempos son orientativos.

| # | Documento | Qué aprendes | Tiempo |
| --- | --- | --- | --- |
| 1 | [Visión general y arquitectura](01-vision-general-y-arquitectura.md) | Qué hace el sistema, sus tres piezas y cómo fluyen los datos | 30 min |
| 2 | [Instalación y entorno](02-instalacion-y-entorno.md) | Dejar todo funcionando en tu máquina (Windows, macOS o Linux) | 1–2 h |
| 3 | [Configuración](03-configuracion.md) | Cada variable: dónde va, qué hace y si tiene efecto | 30 min |
| 4 | [Backend](04-backend.md) | Cada archivo del servidor, en orden de ejecución | 1–2 h |
| 5 | [Frontend](05-frontend.md) | Cada archivo del cliente y cómo se conectan | 1–2 h |
| 6 | [Base de datos](06-base-de-datos.md) | La tabla, el script de creación y las consultas útiles | 20 min |
| 7 | [API](07-api.md) | Endpoints, formato del CSV, respuestas y errores | 30 min |
| 8 | [Pruebas y calidad](08-pruebas-y-calidad.md) | Pruebas, lint, convenciones y flujo con git | 45 min |
| 9 | [Docker, CI y despliegue](09-docker-ci-y-despliegue.md) | Imágenes, docker-compose, GitHub Actions, producción | 45 min |
| 10 | [Guías de cambio y escalado](10-guias-de-cambio-y-escalado.md) | Recetas: columna nueva, endpoint, página, dominio, escalar | Consulta |
| 11 | [Solución de problemas](11-solucion-de-problemas.md) | Síntoma → causa → solución | Consulta |
| 12 | [Problemas conocidos](12-problemas-conocidos.md) | Lo que hoy no funciona bien y cómo corregirlo | 20 min |
| 13 | [Inventario de archivos](13-inventario-de-archivos.md) | Para qué sirve cada archivo | Consulta |
| 14 | [Prueba E2E con Docker](14-prueba-e2e-con-docker.md) | Probar todo el sistema con un SQL Server desechable, gestores SQL y limpieza | 1 h |

## Primer día: objetivos

- [ ] Proyecto instalado y `npm test` en verde ([02](02-instalacion-y-entorno.md)).
- [ ] Cliente y servidor corriendo; los 5 puntos de la verificación de [02, sección 2.7](02-instalacion-y-entorno.md#27-comprobar-que-todo-funciona) completados.
- [ ] Un CSV de ejemplo cargado y visible en la página Asesores.
- [ ] Recorrido del flujo de carga con el código abierto, siguiendo el diagrama de [01, sección 1.6](01-vision-general-y-arquitectura.md#16-flujo-1-cargar-un-archivo-csv-paso-a-paso).

## Primera semana: objetivos

- [ ] Leídos los documentos 1 a 9.
- [ ] Prueba E2E completa con Docker, incluida la limpieza ([14](14-prueba-e2e-con-docker.md)).
- [ ] Una prueba nueva escrita para un componente sin cobertura ([08, sección 8.2](08-pruebas-y-calidad.md#82-qué-pruebas-existen)).
- [ ] Un cambio pequeño abierto como *pull request* siguiendo la lista de [08, sección 8.7](08-pruebas-y-calidad.md#87-lista-de-revisión-antes-del-pull-request).

## Mantener esta documentación

- **Si cambias el comportamiento, cambia la documentación en el mismo *pull request*.**
- Variables de entorno → [03](03-configuracion.md). Endpoints o formato del CSV → [07](07-api.md). Archivos nuevos → [13](13-inventario-de-archivos.md). Errores conocidos corregidos → quítalos de [12](12-problemas-conocidos.md).
- Los diagramas usan Mermaid: edítalos como texto dentro de los bloques `mermaid`.
