function LoadingState({ rows = 4 }) {
  return (
    <div className="skeleton-list" aria-label="Cargando contenido" aria-busy="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="skeleton-row" />
      ))}
    </div>
  );
}

export default LoadingState;
