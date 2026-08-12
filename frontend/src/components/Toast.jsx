import { useEffect } from 'react';

function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    if (!message) return undefined;
    const timeout = window.setTimeout(onClose, 4000);
    return () => window.clearTimeout(timeout);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className={`toast toast--${type}`} role={type === 'error' ? 'alert' : 'status'} aria-live={type === 'error' ? 'assertive' : 'polite'}>
      <span className="toast__icon" aria-hidden="true">{type === 'success' ? '✓' : '!'}</span>
      <span>{message}</span>
      <button type="button" className="toast__close" onClick={onClose} aria-label="Cerrar notificación">×</button>
    </div>
  );
}

export default Toast;
