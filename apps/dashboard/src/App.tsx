export const App = () => (
  <main className="app-shell">
    <aside className="sidebar" aria-label="Navegacao principal">
      <strong>faqchatbot</strong>
      <nav>
        <a href="#dashboard">Dashboard</a>
        <a href="#clientes">Clientes</a>
        <a href="#conversas">Conversas</a>
        <a href="#analytics">Analytics</a>
        <a href="#logs">Logs</a>
      </nav>
    </aside>
    <section className="content">
      <header>
        <p>Plataforma</p>
        <h1>Embeddable AI Platform</h1>
      </header>
      <div className="metric-grid">
        <article>
          <span>Clientes ativos</span>
          <strong>0</strong>
        </article>
        <article>
          <span>Conversas hoje</span>
          <strong>0</strong>
        </article>
        <article>
          <span>Tempo medio</span>
          <strong>0 ms</strong>
        </article>
      </div>
    </section>
  </main>
);

