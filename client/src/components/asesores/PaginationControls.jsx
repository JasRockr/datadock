import PropTypes from 'prop-types';

/**
 * Componente PaginationControls
 * 
 * Renderiza los controles de paginación para navegar entre páginas de datos.
 * 
 * @component
 * @example
 * return (
 *   <PaginationControls
 *     currentPage={currentPage}
 *     totalPages={totalPages}
 *     onPageChange={goToPage}
 *     onNext={nextPage}
 *     onPrev={prevPage}
 *   />
 * )
 */
function PaginationControls({ currentPage, totalPages, onPageChange, onNext, onPrev }) {
  const getPaginationGroup = () => {
    const groupSize = 5; // Número máximo de páginas visibles en el grupo
    const startPage = Math.max(1, currentPage - Math.floor(groupSize / 2));
    const endPage = Math.min(totalPages, startPage + groupSize - 1);

    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };

  return (
    <div className="pagination-controls" aria-label="Paginación">
      <button onClick={onPrev} disabled={currentPage === 1}>
        Anterior
      </button>
      {getPaginationGroup().map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={page === currentPage ? 'active' : ''}
        >
          {page}
        </button>
      ))}
      <button onClick={onNext} disabled={currentPage === totalPages}>
        Siguiente
      </button>
    </div>
  );
}

PaginationControls.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
  onPrev: PropTypes.func.isRequired,
};

export default PaginationControls;
