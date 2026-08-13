import { useMsal } from '@azure/msal-react';

function NoAutorizado() {
  const { instance } = useMsal();

  return (
    <main className="denied-page">
      <section className="denied-card">
        <div className="denied-card__icon">!</div>
        <p className="denied-card__eyebrow">Acceso restringido</p>
        <h1>No estás autorizado</h1>
        <p>Tienes una cuenta válida de Microsoft, pero no estás autorizado para acceder a esta aplicación.</p>
        <p>Contacta con el administrador.</p>
        <button className="button button--primary" type="button" onClick={() => instance.logoutRedirect()}>Cerrar sesión</button>
      </section>
    </main>
  );
}

export default NoAutorizado;
