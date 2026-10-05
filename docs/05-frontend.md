# 5. Frontend (`client/`) en detalle

> Recorrido por **cada archivo del cliente**: qué hace, cómo se conecta con los demás y cómo modificarlo.

## 5.1 Tecnologías

| Paquete | Versión | Para qué |
| --- | --- | --- |
| `react` / `react-dom` | 18.2 | Biblioteca de interfaz basada en componentes |
| `react-router-dom` | 6.15 | Navegación entre páginas sin recargar (`/asesores`, `/upload`) |
| `vite` + `@vitejs/plugin-react-swc` | 4.4 | Servidor de desarrollo y empaquetado para producción |
| `tailwindcss` + `postcss` + `autoprefixer` | 3.3 | Estilos con clases utilitarias (`bg-green-600`, `p-4`…) |
| `sweetalert2` | 11 | Alertas y notificaciones emergentes |
| `react-spinners` | 0.13 | Indicador de carga animado (`BeatLoader`) |
| `prop-types` | 15.8 | Valida en desarrollo las *props* que recibe cada componente |
| *desarrollo:* `vitest`, `jsdom`, `@testing-library/*`, `eslint` | — | Pruebas (con un navegador simulado) y estilo |

> **¿JavaScript o TypeScript?** El cliente está escrito en **JavaScript con JSX** (`.jsx`). Los paquetes `@types/react` solo mejoran el autocompletado del editor.

## 5.2 Estructura de `client/`

Cada carpeta de `src/` tiene **una sola responsabilidad**:

```text
client/
├── index.html                    ← Página HTML base; carga src/main.jsx
├── public/ico.svg                ← Ícono de la pestaña (se copia tal cual al build)
├── src/
│   ├── main.jsx                  ← Punto de entrada: monta <App/>
│   ├── App.jsx                   ← Proveedor de estado + rutas
│   ├── App.css                   ← Estilos propios (tabla, paginación, selector de fechas)
│   ├── index.css                 ← Tailwind + estilos globales
│   ├── config.js                 ← URL de la API y extensiones permitidas
│   ├── pages/                    ← UNA página por ruta; orquestan componentes
│   │   ├── AsesoresPage.jsx      ← /asesores (Asesores)
│   │   └── CargaArchivoPage.jsx  ← /upload
│   ├── components/               ← Piezas de interfaz reutilizables
│   │   ├── NavBar.jsx
│   │   └── asesores/             ← Piezas del listado de asesores
│   │       ├── DataTable.jsx
│   │       ├── PaginationControls.jsx
│   │       ├── ConnectivityStatus.jsx
│   │       ├── DateRangePicker.jsx
│   │       ├── SavedFilters.jsx
│   │       └── ExportData.jsx
│   ├── context/
│   │   └── AppContext.jsx        ← Estado global y acciones
│   ├── services/                 ← Efectos hacia fuera: red, caché, alertas
│   │   ├── apiService.js
│   │   ├── cacheService.js
│   │   └── notifications.js
│   └── utils/                    ← Funciones puras, sin estado ni efectos
│       ├── dataProcessing.js     ← Filtrado, orden y formato de fechas
│       └── fileValidator.js      ← Validación del CSV antes de enviarlo
├── __tests__/                    ← Pruebas Vitest (ver 08)
├── nginx/nginx.conf              ← Servidor web de la imagen Docker
├── vite.config.js  tailwind.config.js  postcss.config.js  .eslintrc.cjs
├── .env.example                  ← Plantilla de VITE_API_URL
├── Dockerfile  .dockerignore  .gitignore
└── package.json  package-lock.json
```

**¿Dónde pongo algo nuevo?**

| Si es… | Va en… |
| --- | --- |
| Una pantalla con su propia URL | `pages/` |
| Una pieza visual que usa una página | `components/` (en una subcarpeta por tema, como `asesores/`) |
| Estado compartido entre páginas | `context/` |
| Algo que habla con el exterior (HTTP, `localStorage`, alertas) | `services/` |
| Una función que recibe datos y devuelve datos, sin efectos | `utils/` |

## 5.3 Cómo arranca el cliente

1. El navegador pide `index.html`.
2. `index.html` tiene `<div id="root">` y carga `/src/main.jsx`.
3. `main.jsx` importa `index.css` (Tailwind) y dibuja `<App />` dentro de `#root`, envuelto en `React.StrictMode`.
4. `App.jsx` envuelve todo en `<AppProvider>` (estado global) y `<Router>`, dibuja `<NavBar/>` y elige la página según la URL.

> **`React.StrictMode`** hace que, **solo en desarrollo**, React ejecute dos veces algunos efectos para detectar errores. Si en desarrollo ves peticiones duplicadas en la pestaña *Network*, es por esto; en producción no ocurre.

## 5.4 Rutas (páginas)

Definidas en `src/App.jsx`:

| URL | Página | Qué muestra |
| --- | --- | --- |
| `/` | `<Navigate to="/asesores">` | Redirige al listado |
| `/asesores` | `pages/AsesoresPage.jsx` | Listado ("Asesores" en el menú) |
| `/upload` | `pages/CargaArchivoPage.jsx` | Carga de CSV ("Cargar Archivo" en el menú) |
| cualquier otra | — | Solo la barra de navegación (no hay página 404) |

**Cómo agregar una página:** receta en [10-guias-de-cambio-y-escalado.md](10-guias-de-cambio-y-escalado.md#103-agregar-una-página-nueva-al-cliente).

## 5.5 Estado global: `src/context/AppContext.jsx`

Es el "cerebro" del cliente. Usa **Context + useReducer** de React: un único objeto de estado que cualquier componente puede leer con `useAppContext()`.

### Forma del estado

```js
{
  asesores:     { data: [], loading: false, error: null, lastUpdated: null },
  uploadStatus: { uploading: false, progress: 0, success: null, error: null },
  connectivity: { isOnline: navigator.onLine, serverAvailable: true }
}
```

### Acciones (lo que los componentes pueden pedir)

| Acción | Qué hace |
| --- | --- |
| `actions.fetchAsesores(forceRefresh = false)` | Si hay caché de menos de 5 min y no se fuerza, la usa. Si no, llama a `ApiService.fetchAsesores()` y guarda el resultado en la caché y en `state.asesores`. |
| `actions.uploadFile(formData)` | Marca `uploading`, simula una barra de progreso (sube entre 5 y 20 % cada 500 ms hasta el 90 %; **no es el progreso real**) y llama a `ApiService.uploadFile()`. Si sale bien: borra la caché, recarga los asesores y muestra la alerta de éxito. Si falla: guarda el error y muestra una notificación. |
| `actions.checkServerConnectivity()` | Llama a `ApiService.checkConnectivity()`, actualiza `connectivity.serverAvailable` y **devuelve** `true` o `false`. |

### Efectos al montar

- 1 segundo después de abrir la aplicación: `checkServerConnectivity()`.
- Escucha los eventos `online`/`offline` del navegador; al volver la conexión, comprueba el servidor otra vez.

### Cómo usarlo en un componente

```jsx
import { useAppContext } from '../context/AppContext';

function MiComponente() {
  const { state, actions } = useAppContext();
  const { data, loading } = state.asesores;
  // ...
  return <button onClick={() => actions.fetchAsesores(true)}>Recargar</button>;
}
```

`useAppContext()` lanza un error si el componente no está dentro de `<AppProvider>`. En las pruebas se reemplaza con `vi.mock` (ver [08](08-pruebas-y-calidad.md)).

### Cómo agregar un dato o una acción

1. Agrega el campo en `initialState`.
2. Agrega un tipo en `ActionTypes` y su `case` en `appReducer`. **El reducer nunca modifica el estado: siempre devuelve un objeto nuevo** (`{...state, ...}`).
3. Agrega la función en `actions`, que llama a `dispatch({ type, payload })`.
4. `actions` se memoriza una sola vez (`useMemo(..., [])`). Dentro de una acción **no leas `state`**, porque verías el valor inicial: usa lo que devuelve la API, o haz que la acción **devuelva** el resultado (como `checkServerConnectivity`).

## 5.6 Comunicación con el servidor: `src/services/apiService.js`

**Es la única puerta de salida HTTP.** Ningún componente debe llamar a `fetch` directamente.

| Método | Petición | Devuelve |
| --- | --- | --- |
| `fetchAsesores(params)` | `GET {API}/asesores?params` | El JSON del servidor, o `{status:'error', message}` |
| `uploadFile(formData)` | `POST {API}/upload` con el `FormData` | El JSON del servidor, o `{status:'error', ...}` |
| `checkConnectivity()` | `GET {API_BASE}/health`, con 3 s de límite | `true` / `false`. No depende de la base de datos. |

`handleResponse(response)`: si la respuesta no es 2xx, la transforma en `{status:'error', code: <HTTP>, message, errors, details}`. Por eso los componentes **solo** tienen que mirar `result.status === 'error'`.

> Al enviar `FormData` **no** pongas la cabecera `Content-Type`: el navegador la genera con el separador (*boundary*) del *multipart*. Si la pones a mano, el servidor no encontrará el archivo.

## 5.7 `src/config.js`

Calcula `API_ENDPOINT`, `API_BASE`, `API_ENDPOINT_ASESORES` y `API_ENDPOINT_UPLOAD` a partir de `VITE_API_URL` (por defecto `http://localhost:5128/api`) y exporta `ALLOWED_EXTENSIONS = ['.csv']`. Ver [03-configuracion.md](03-configuracion.md#34-configuración-del-cliente).

## 5.8 Página de carga: `src/pages/CargaArchivoPage.jsx`

Lo que hace el usuario y lo que ocurre por dentro:

1. **Selecciona o arrastra un archivo** → `handleFileChange` / `handleDrop` → `handleFileValidation(file)` → `fileValidator.validateCsvFile(file)`.
   - Válido: guarda el archivo en el estado local `file` y muestra un aviso.
   - Inválido: muestra la lista de errores (en pantalla y en una alerta).
2. **Clic en "Cargar Archivo"** → `handleUpload`:
   - Si el estado dice que no hay conexión, ejecuta `checkServerConnectivity()` y **usa el resultado que devuelve** (el estado del render actual está desactualizado). Si sigue sin conexión, muestra un error.
   - Crea un `FormData` con el campo **`file`** y llama a `actions.uploadFile(formData)`.
3. **Durante la carga:** barra de progreso con `uploadStatus.progress`.
4. **Al terminar:**
   - Éxito: tarjeta verde "Resumen del procesamiento" con total, insertados, errores y "Carga parcial" o "Carga completa".
   - Error: mensaje rojo y, debajo, un bloque amarillo "Información de depuración" (estado de la conexión y URL usada).

Estado local del componente: `file`, `error`, `validationErrors`, `validatingFile` y `dragActive`. El estado de la carga (`uploading`, `progress`, `success`) vive en `AppContext`.

El panel "Instrucciones" describe el formato de CSV que acepta el servidor. **Si cambian las reglas del servidor, actualiza este texto.**

## 5.9 Validación previa: `src/utils/fileValidator.js`

`validateCsvFile(file)` devuelve `{ valid, errors: [{message, field?, row?}] }`:

1. Extensión dentro de `ALLOWED_EXTENSIONS`.
2. Tamaño ≤ 10 MB (`MAX_FILE_SIZE`).
3. Tipo MIME: si es inusual, solo deja una advertencia en la consola.
4. Contenido (lee **solo los primeros 32 KB**):
   - No está vacío.
   - Detecta el separador (`;`, `,`, tabulador o `|`), igual que el servidor.
   - La cabecera contiene las columnas de `REQUIRED_FIELDS`.
   - Hay al menos una fila de datos.
   - La primera fila tiene tantos campos como la cabecera.
   - Las primeras 5 filas tienen valor en las columnas obligatorias.

## 5.10 Página de listado: `src/pages/AsesoresPage.jsx`

Arma el listado con piezas pequeñas:

```text
AsesoresPage
├── ConnectivityStatus   (avisos de conexión / error)
├── cabecera: título, ExportData, "Mostrar filtros", "Actualizar", tamaño de página
├── (si showFilters) búsqueda general + DateRangePicker
├── SavedFilters
├── DataTable            (dibuja la página actual)
└── PaginationControls
```

Cómo calcula lo que muestra, **sin estado duplicado ni efectos**:

```js
const asesores      = useMemo(() => data?.asesores || data || [], [data]);
const processedData = useMemo(
  () => processRows(asesores, { columns, globalFilter, dateRange, sort: DEFAULT_SORT }),
  [asesores, globalFilter, dateRange],
);
const paginatedData = useMemo(() => processedData.slice(inicio, inicio + pageSize), [...]);
```

`columns` y `DEFAULT_SORT` se definen **fuera** del componente para que su identidad no cambie entre renders.

| Archivo | Responsabilidad | Props principales |
| --- | --- | --- |
| **`pages/AsesoresPage.jsx`** | Pide los datos al montar (`fetchAsesores`), guarda la búsqueda, el rango de fechas, la página y el tamaño de página, y define las **columnas** (`id`, `header`, `accessor` y `cell` opcional). | — |
| **`utils/dataProcessing.js`** | Funciones puras. `processRows(data, {columns, globalFilter, dateRange, sort})` aplica la búsqueda global (en todas las columnas, sin distinguir mayúsculas), el rango de fechas (días límite incluidos) y el orden. `toDayKey(valor)` devuelve `AAAA-MM-DD`. `formatDay(valor)` devuelve `D/M/AAAA`. | — |
| **`components/asesores/DataTable.jsx`** | Dibuja `<table>`. Usa `column.cell(valor)`, si existe, para formatear. | `data`, `columns`, `generateUniqueKey` |
| **`components/asesores/PaginationControls.jsx`** | Botones Anterior, números (hasta 5 visibles) y Siguiente. | `currentPage`, `totalPages`, `onPageChange`, `onNext`, `onPrev` |
| **`components/asesores/ConnectivityStatus.jsx`** | *Spinner* mientras carga, recuadro rojo si hay error, aviso amarillo sin conexión. | `isOnline`, `serverAvailable`, `loading`, `refreshing`, `error`, `onRetry` |
| **`components/asesores/DateRangePicker.jsx`** | Dos `input type="date"` y los atajos *Hoy*, *7 días*, *Mes actual* y *Limpiar*. Si "desde" queda después de "hasta", los iguala. | `value: {start, end}`, `onChange` |
| **`components/asesores/SavedFilters.jsx`** | Guarda con un nombre la búsqueda y el rango de fechas en `localStorage` (`datadock.savedFilters`) y los muestra como botones para aplicarlos o borrarlos. **Se guardan por navegador**, no en el servidor. | `currentFilter`, `onApply` |
| **`components/asesores/ExportData.jsx`** | Descarga los datos **filtrados** (todas las páginas) como `asesores.csv` (separador `;`, valores entre comillas) o `asesores.json`. | `data`, `columns`, `filename` |

### Fechas y zonas horarias

La API envía `fecha_novedad` como medianoche UTC (`2024-01-15T00:00:00.000Z`). Si se mostrara con `new Date(valor).toLocaleDateString()`, en Colombia (UTC-5) aparecería **14/1/2024**. Por eso:

- **Para mostrar y filtrar fechas de la API usa `formatDay` y `toDayKey`** de `utils/dataProcessing.js`: toman el día escrito por la API, sin convertirlo a la hora local.
- Las fechas del selector (`DateRangePicker`) son medianoche **local**; `toDayKey` también las convierte a su día local, así que la comparación es día contra día.

**Cómo agregar una columna a la tabla:** agrega un objeto al arreglo `columns` de `AsesoresPage.jsx`:

```js
{ id: 'correo_contacto', header: 'Correo', accessor: asesor => asesor.correo_contacto },
```

Aparece automáticamente en la tabla, en la búsqueda global y en las exportaciones.

## 5.11 `src/components/NavBar.jsx`

Barra verde con dos enlaces (`Link` de react-router): **Asesores** (`/asesores`) y **Cargar Archivo** (`/upload`). Resalta la ruta activa con `useLocation()`. En pantallas de menos de 768 px muestra un botón que despliega los enlaces. Para agregar un enlace, cópialo en **los dos** bloques: el de escritorio y el menú móvil.

## 5.12 Servicios menores

- **`services/cacheService.js`:** un `Map` en memoria con fecha de expiración por clave (`get`, `set(key, value, ttl)`, `delete`, `clear`, `cleanExpired`). Se exporta **una sola instancia** para toda la aplicación y se vacía al recargar la página.
- **`services/notifications.js`:** envoltorio de SweetAlert2. `showSuccess`, `showError`, `showWarning` y `showInfo` muestran una notificación pequeña (*toast*) arriba a la derecha durante 3 s. `showResultAlert` y `showValidationErrors` abren una ventana modal. `showConfirm` devuelve `true`/`false` (sin uso actual).
  - `showValidationErrors` inserta los mensajes como HTML. Si algún día muestras ahí texto que viene del servidor o del archivo, escápalo antes para evitar la inyección de HTML (XSS).

## 5.13 Estilos

- **Tailwind** (clases dentro del JSX) para casi todo. `tailwind.config.js` indica qué archivos escanear (`index.html`, `src/**/*.{js,jsx,ts,tsx}`). **Una clase que no aparece escrita literalmente en esos archivos no se genera**, así que no construyas nombres de clase por partes (`'bg-' + color`): escríbelos completos.
- **`index.css`:** activa Tailwind (`@tailwind base/components/utilities`) y define estilos globales (fuente, fondo, foco visible).
- **`App.css`:** clases propias con nombre (`.data-table`, `.pagination-controls`, `.date-range-picker__*`) para la tabla, la paginación y el selector de fechas, más ajustes para pantallas pequeñas.
- Colores de marca: verde (`green-600` / `#16a34a`; `#10B981` en las alertas).
- Diseño adaptable desde 320 px: la tabla se desplaza horizontalmente si no cabe.

## 5.14 Reglas del frontend (resumen)

1. Las llamadas HTTP van solo en `services/apiService.js`; los componentes usan las `actions` del contexto.
2. Cada carpeta de `src/` tiene una responsabilidad (tabla de la sección 5.2).
3. Cada componente declara sus `propTypes`.
4. Los datos derivados se calculan con `useMemo` y funciones puras, **no** con `useEffect` + `setState`: eso duplica el estado y puede provocar bucles de renders.
5. Los objetos y funciones que se pasan como dependencias de `useMemo`/`useEffect` deben ser **estables** (definidos fuera del componente, o con `useMemo`/`useCallback`).
6. Las fechas de la API se muestran y comparan con `formatDay` / `toDayKey`.
7. El orden de los imports: React → bibliotecas externas → componentes propios → utilidades, servicios y estilos, separados por una línea en blanco.
8. Cada componente o función nueva lleva su prueba en `client/__tests__/`.

Siguiente paso: [06-base-de-datos.md](06-base-de-datos.md).
