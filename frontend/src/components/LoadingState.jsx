function LoadingState({ rows = 4 }) {
  return (
    <div style={{ display: 'grid', gap: '0.8rem' }}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} style={{ height: '56px', borderRadius: '12px', background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.2s infinite' }} />
      ))}
    </div>
  );
}

export default LoadingState;
