import { Link } from 'react-router-dom';

function BackToConfiguration() {
  return (
    <Link className="back-to-configuration" to="/configuracion">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 7 4 12l5 5M5 12h8a6 6 0 0 1 6 6" />
      </svg>
      <span>Volver a configuración</span>
    </Link>
  );
}

export default BackToConfiguration;
