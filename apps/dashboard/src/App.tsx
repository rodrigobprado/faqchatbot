import { useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  buildWidgetSnippet,
  createTenant,
  listTenants,
  loginAdmin,
  refreshAdmin,
  type AdminSession,
  type CreateTenantPayload,
  type TenantRecord
} from "./api.js";

const STORAGE_KEY = "faqchatbot.dashboard.session.v1";

type LoginState = Readonly<{
  email: string;
  password: string;
}>;

type TenantFormState = Readonly<{
  publicId: string;
  name: string;
  planSlug: CreateTenantPayload["planSlug"];
  defaultLocale: string;
}>;

type ViewState = Readonly<{
  loading: boolean;
  error: string | null;
  notice: string | null;
}>;

const defaultLoginState = (): LoginState => ({
  email: "",
  password: ""
});

const defaultTenantFormState = (): TenantFormState => ({
  publicId: "",
  name: "",
  planSlug: "starter",
  defaultLocale: "pt-BR"
});

const readStoredSession = (): AdminSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
};

const formatTenantStatus = (status: TenantRecord["status"]) => {
  switch (status) {
    case "active":
      return "Ativo";
    case "inactive":
      return "Inativo";
    case "suspended":
      return "Suspenso";
    default:
      return status;
  }
};

const getPlanLabel = (planId: string) => {
  const labels: Record<string, string> = {
    "plan-free": "Free",
    "plan-starter": "Starter",
    "plan-growth": "Growth",
    "plan-enterprise": "Enterprise"
  };

  return labels[planId] ?? planId;
};

export const App = () => {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [loginState, setLoginState] = useState<LoginState>(defaultLoginState);
  const [tenantForm, setTenantForm] = useState<TenantFormState>(defaultTenantFormState);
  const [viewState, setViewState] = useState<ViewState>({
    loading: false,
    error: null,
    notice: null
  });

  useEffect(() => {
    setSession(readStoredSession());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (session) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      return;
    }

    window.localStorage.removeItem(STORAGE_KEY);
  }, [session]);

  useEffect(() => {
    if (!session) {
      setTenants([]);
      return;
    }

    void loadTenants(session);
  }, [session]);

  const updateNotice = (notice: string | null) => {
    setViewState((current) => ({
      ...current,
      notice,
      error: null
    }));
  };

  const updateError = (error: string | null) => {
    setViewState((current) => ({
      ...current,
      error,
      notice: null
    }));
  };

  const withSessionRetry = async <T,>(action: (accessToken: string) => Promise<T>): Promise<T> => {
    if (!session) {
      throw new ApiError("Sessao administrativa ausente", 401);
    }

    try {
      return await action(session.accessToken);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        throw error;
      }

      const refreshed = await refreshAdmin(session.refreshToken);
      setSession(refreshed);
      return action(refreshed.accessToken);
    }
  };

  const loadTenants = async (currentSession = session) => {
    if (!currentSession) {
      return;
    }

    setViewState((current) => ({ ...current, loading: true, error: null }));

    try {
      const items = await withSessionRetry((accessToken) => listTenants(accessToken));
      setTenants(items);
      setViewState((current) => ({
        ...current,
        loading: false,
        notice: `${items.length} tenant(s) carregado(s).`
      }));
    } catch (error) {
      setViewState((current) => ({ ...current, loading: false }));

      if (error instanceof ApiError && error.status === 401) {
        setSession(null);
        setTenants([]);
        updateError("Sessao expirada. Entre novamente.");
        return;
      }

      updateError(error instanceof Error ? error.message : "Falha ao carregar tenants");
    }
  };

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setViewState((current) => ({ ...current, loading: true, error: null, notice: null }));

    try {
      const result = await loginAdmin(loginState);
      setSession(result);
      setLoginState(defaultLoginState);
      setViewState((current) => ({
        ...current,
        loading: false,
        notice: `Bem-vindo, ${result.user.email}.`
      }));
    } catch (error) {
      setViewState((current) => ({ ...current, loading: false }));
      updateError(error instanceof Error ? error.message : "Falha ao autenticar");
    }
  };

  const handleRefresh = async () => {
    if (!session) {
      return;
    }

    setViewState((current) => ({ ...current, loading: true, error: null, notice: null }));

    try {
      const refreshed = await refreshAdmin(session.refreshToken);
      setSession(refreshed);
      setViewState((current) => ({
        ...current,
        loading: false,
        notice: "Sessao renovada com sucesso."
      }));
    } catch (error) {
      setSession(null);
      setTenants([]);
      setViewState((current) => ({ ...current, loading: false }));
      updateError(error instanceof Error ? error.message : "Falha ao renovar sessao");
    }
  };

  const handleLogout = () => {
    setSession(null);
    setTenants([]);
    setLoginState(defaultLoginState);
    setTenantForm(defaultTenantFormState);
    setViewState({
      loading: false,
      error: null,
      notice: "Sessao encerrada."
    });
  };

  const handleCreateTenantSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setViewState((current) => ({ ...current, loading: true, error: null, notice: null }));

    try {
      await withSessionRetry((accessToken) =>
        createTenant(accessToken, {
          publicId: tenantForm.publicId,
          name: tenantForm.name,
          planSlug: tenantForm.planSlug,
          defaultLocale: tenantForm.defaultLocale
        }),
      );

      setTenantForm(defaultTenantFormState());
      await loadTenants();
      updateNotice("Tenant criado com sucesso.");
    } catch (error) {
      setViewState((current) => ({ ...current, loading: false }));

      if (error instanceof ApiError && error.status === 401) {
        setSession(null);
        setTenants([]);
        updateError("Sessao expirada. Entre novamente.");
        return;
      }

      updateError(error instanceof Error ? error.message : "Falha ao criar tenant");
    }
  };

  const canSubmitTenant = Boolean(tenantForm.publicId.trim() && tenantForm.name.trim() && session);
  const totalActiveTenants = tenants.filter((tenant) => tenant.status === "active").length;
  const totalSuspendedTenants = tenants.filter((tenant) => tenant.status === "suspended").length;
  const firstTenantSnippet = tenants[0] ? buildWidgetSnippet(tenants[0].publicId) : null;

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navegacao principal">
        <div className="brand-lockup">
          <span className="brand-mark">FAQ</span>
          <div>
            <strong>faqchatbot</strong>
            <p>Admin console</p>
          </div>
        </div>

        <nav>
          <a href="#overview">Visao geral</a>
          <a href="#tenants">Tenants</a>
          <a href="#widget">Widget</a>
          <a href="#config">Configuracao</a>
        </nav>

        <section className="sidebar-panel">
          <span>Status</span>
          <strong>{session ? "Autenticado" : "Desconectado"}</strong>
          <p>{session ? session.user.email : "Entre para carregar os dados administrativos."}</p>
        </section>
      </aside>

      <section className="content">
        <header className="page-header">
          <div>
            <p>Plataforma</p>
            <h1>Embeddable AI Platform</h1>
            <span>Operacao multi-tenant, dashboard administrativo e widget embutivel.</span>
          </div>

          <div className="header-actions">
            {session ? (
              <>
                <button type="button" className="secondary" onClick={handleRefresh} disabled={viewState.loading}>
                  Renovar sessao
                </button>
                <button type="button" className="secondary danger" onClick={handleLogout}>
                  Sair
                </button>
              </>
            ) : null}
          </div>
        </header>

        {viewState.error ? <div className="banner error">{viewState.error}</div> : null}
        {viewState.notice ? <div className="banner success">{viewState.notice}</div> : null}

        {!session ? (
          <section className="auth-grid" id="overview">
            <article className="hero-card">
              <p className="eyebrow">Controle operacional</p>
              <h2>Entre no painel para administrar tenants, widgets e configuracoes.</h2>
              <p>
                O dashboard consome a API atual da plataforma e permite iniciar a operacao sem tocar
                diretamente no banco.
              </p>
              <ul>
                <li>Login administrativo com refresh token.</li>
                <li>Cadastro de tenants pronto para uso.</li>
                <li>Snippet do widget gerado por tenant.</li>
              </ul>
            </article>

            <article className="surface auth-card">
              <h2>Acesso administrativo</h2>
              <form className="stack" onSubmit={handleLoginSubmit}>
                <label>
                  <span>E-mail</span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={loginState.email}
                    onChange={(event) =>
                      setLoginState((current) => ({ ...current, email: event.target.value }))
                    }
                    placeholder="admin@empresa.com"
                    required
                  />
                </label>

                <label>
                  <span>Senha</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={loginState.password}
                    onChange={(event) =>
                      setLoginState((current) => ({ ...current, password: event.target.value }))
                    }
                    placeholder="••••••••"
                    required
                  />
                </label>

                <button type="submit" className="primary" disabled={viewState.loading}>
                  {viewState.loading ? "Entrando..." : "Entrar"}
                </button>
              </form>
            </article>
          </section>
        ) : (
          <>
            <section className="metric-grid" id="overview">
              <article className="surface metric-card">
                <span>Tenants ativos</span>
                <strong>{totalActiveTenants}</strong>
              </article>
              <article className="surface metric-card">
                <span>Tenants suspensos</span>
                <strong>{totalSuspendedTenants}</strong>
              </article>
              <article className="surface metric-card">
                <span>Tenants totais</span>
                <strong>{tenants.length}</strong>
              </article>
            </section>

            <section className="two-column">
              <article className="surface" id="tenants">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Clientes</p>
                    <h2>Lista de tenants</h2>
                  </div>
                  <button type="button" className="secondary" onClick={() => void loadTenants()} disabled={viewState.loading}>
                    Recarregar
                  </button>
                </div>

                <div className="table">
                  <div className="table-row table-head">
                    <span>Public ID</span>
                    <span>Nome</span>
                    <span>Plano</span>
                    <span>Status</span>
                  </div>

                  {tenants.length === 0 ? (
                    <div className="empty-state">
                      <strong>Nenhum tenant encontrado.</strong>
                      <p>Crie o primeiro cliente para liberar o widget e os fluxos administrativos.</p>
                    </div>
                  ) : (
                    tenants.map((tenant) => (
                      <div className="table-row" key={tenant.id}>
                        <span className="mono">{tenant.publicId}</span>
                        <span>{tenant.name}</span>
                        <span>{getPlanLabel(tenant.planId)}</span>
                        <span>{formatTenantStatus(tenant.status)}</span>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="surface" id="config">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Operacao inicial</p>
                    <h2>Criar tenant</h2>
                  </div>
                </div>

                <form className="stack" onSubmit={handleCreateTenantSubmit}>
                  <label>
                    <span>Public ID</span>
                    <input
                      value={tenantForm.publicId}
                      onChange={(event) =>
                        setTenantForm((current) => ({ ...current, publicId: event.target.value }))
                      }
                      placeholder="acme"
                      required
                    />
                  </label>

                  <label>
                    <span>Nome</span>
                    <input
                      value={tenantForm.name}
                      onChange={(event) =>
                        setTenantForm((current) => ({ ...current, name: event.target.value }))
                      }
                      placeholder="Acme Ltda"
                      required
                    />
                  </label>

                  <label>
                    <span>Plano</span>
                    <select
                      value={tenantForm.planSlug}
                      onChange={(event) =>
                        setTenantForm((current) => ({
                          ...current,
                          planSlug: event.target.value as CreateTenantPayload["planSlug"]
                        }))
                      }
                    >
                      <option value="free">Free</option>
                      <option value="starter">Starter</option>
                      <option value="growth">Growth</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </label>

                  <label>
                    <span>Locale padrao</span>
                    <input
                      value={tenantForm.defaultLocale}
                      onChange={(event) =>
                        setTenantForm((current) => ({ ...current, defaultLocale: event.target.value }))
                      }
                      placeholder="pt-BR"
                      required
                    />
                  </label>

                  <button type="submit" className="primary" disabled={viewState.loading || !canSubmitTenant}>
                    {viewState.loading ? "Salvando..." : "Criar tenant"}
                  </button>
                </form>
              </article>
            </section>

            <section className="surface widget-card" id="widget">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Widget</p>
                  <h2>Snippet de instalacao</h2>
                </div>
              </div>

              {firstTenantSnippet ? (
                <>
                  <p>Snippet gerado para o primeiro tenant carregado.</p>
                  <pre>{firstTenantSnippet}</pre>
                </>
              ) : (
                <p>Crie um tenant para gerar o snippet do widget.</p>
              )}
            </section>

            <section className="surface session-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Sessao</p>
                  <h2>Usuario autenticado</h2>
                </div>
              </div>

              <dl className="session-grid">
                <div>
                  <dt>Email</dt>
                  <dd>{session.user.email}</dd>
                </div>
                <div>
                  <dt>Tenant</dt>
                  <dd className="mono">{session.user.tenantId}</dd>
                </div>
                <div>
                  <dt>Roles</dt>
                  <dd>{session.user.roles.join(", ")}</dd>
                </div>
              </dl>
            </section>
          </>
        )}
      </section>
    </main>
  );
};
