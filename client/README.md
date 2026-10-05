# Cliente de DataDock

Interfaz web de DataDock en **React 18 + Vite 4 + Tailwind CSS 3**: carga de archivos CSV y panel de consulta por dominio (hoy, *asesores*).

- Documentación completa del cliente: [docs/05-frontend.md](../docs/05-frontend.md)
- Configuración (`VITE_API_URL`): [docs/03-configuracion.md](../docs/03-configuracion.md#34-configuración-del-cliente)
- Índice general: [docs/README.md](../docs/README.md)

## Comandos (desde esta carpeta)

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en <http://localhost:5173> |
| `npm test` | Pruebas con Vitest |
| `npm run lint` | ESLint (falla con cualquier advertencia) |
| `npm run build` | Compila a `dist/` |
| `npm run preview` | Sirve `dist/` en <http://localhost:4173> |

Desde la raíz del repositorio también puedes usar `npm run client` o `npm --prefix client <comando>`.
