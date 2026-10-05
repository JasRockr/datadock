// React y bibliotecas de React
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

// Bibliotecas externas

// Componentes propios

// Utilidades, servicios y configuración

/**
 * Componente NavBar
 * 
 * Barra de navegación responsiva que muestra enlaces a las principales secciones de la aplicación.
 * Se adapta a diferentes tamaños de pantalla y resalta la ruta activa.
 * 
 * @component
 * @example
 * return (
 *   <NavBar />
 * )
 */
function NavBar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  
  // Verificar la ruta activa para resaltar el enlace correspondiente
  const isActive = (path) => {
    return location.pathname === path ? 'bg-green-700' : '';
  };

  return (
    <nav className="bg-green-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-white font-bold text-lg">DataDock</span>
            </div>
            <div className="hidden md:ml-6 md:flex md:space-x-4">
              <Link 
                to="/asesores" 
                className={`px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-green-500 ${isActive('/asesores')}`}
              >
                Asesores
              </Link>
              <Link 
                to="/upload" 
                className={`px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-green-500 ${isActive('/upload')}`}
              >
                Cargar Archivo
              </Link>
            </div>
          </div>
          
          {/* Menú para móviles */}
          <div className="flex md:hidden">
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-white hover:bg-green-700 focus:outline-none"
              aria-expanded={isOpen}
            >
              <span className="sr-only">Abrir menú principal</span>
              {/* Ícono de menú */}
              <svg 
                className={`h-6 w-6 ${isOpen ? 'hidden' : 'block'}`} 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {/* Ícono de cerrar */}
              <svg 
                className={`h-6 w-6 ${isOpen ? 'block' : 'hidden'}`} 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Menú móvil */}
      <div className={`md:hidden ${isOpen ? 'block' : 'hidden'}`}>
        <div className="px-2 pt-2 pb-3 space-y-1">
          <Link 
            to="/asesores" 
            className={`block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-green-500 ${isActive('/asesores')}`}
            onClick={() => setIsOpen(false)}
          >
            Asesores
          </Link>
          <Link 
            to="/upload" 
            className={`block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-green-500 ${isActive('/upload')}`}
            onClick={() => setIsOpen(false)}
          >
            Cargar Archivo
          </Link>
        </div>
      </div>
    </nav>
  );
}

// Definición de PropTypes para el componente NavBar
NavBar.propTypes = {
  // El componente no recibe props actualmente, pero podría extenderse con:
  // appName: PropTypes.string,
  // menuItems: PropTypes.arrayOf(PropTypes.shape({
  //   path: PropTypes.string.isRequired,
  //   label: PropTypes.string.isRequired,
  //   icon: PropTypes.element
  // })),
  // userInfo: PropTypes.shape({
  //   name: PropTypes.string,
  //   avatar: PropTypes.string
  // }),
  // onLogout: PropTypes.func
};

export default NavBar;
