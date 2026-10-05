/**
 * Servicio de caché para almacenar temporalmente los resultados de consultas a la API
 * Mejora el rendimiento evitando llamadas innecesarias al servidor
 */

// Configuración del tiempo de vida de la caché (en milisegundos)
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutos por defecto

class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttls = new Map();
  }

  /**
   * Obtiene un valor de la caché
   * @param {string} key - Clave para identificar el valor
   * @returns {any|null} - Valor almacenado o null si no existe o expiró
   */
  get(key) {
    // Verificar si la clave existe y no ha expirado
    if (this.cache.has(key)) {
      const ttl = this.ttls.get(key);
      if (ttl > Date.now()) {
        return this.cache.get(key);
      } else {
        // Eliminar entrada expirada
        this.delete(key);
      }
    }
    return null;
  }

  /**
   * Almacena un valor en la caché
   * @param {string} key - Clave para identificar el valor
   * @param {any} value - Valor a almacenar
   * @param {number} [ttl=DEFAULT_CACHE_TTL] - Tiempo de vida en milisegundos
   */
  set(key, value, ttl = DEFAULT_CACHE_TTL) {
    this.cache.set(key, value);
    this.ttls.set(key, Date.now() + ttl);
  }

  /**
   * Elimina un valor de la caché
   * @param {string} key - Clave del valor a eliminar
   */
  delete(key) {
    this.cache.delete(key);
    this.ttls.delete(key);
  }

  /**
   * Limpia toda la caché
   */
  clear() {
    this.cache.clear();
    this.ttls.clear();
  }

  /**
   * Limpia entradas expiradas de la caché
   */
  cleanExpired() {
    const now = Date.now();
    for (const [key, ttl] of this.ttls.entries()) {
      if (ttl <= now) {
        this.delete(key);
      }
    }
  }
}

// Exportar una instancia única para toda la aplicación
export default new CacheService();