import { useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  buildWidgetSnippet,
  deleteTenant,
  createTenant,
  listTenants,
  loginAdmin,
  refreshAdmin,
  updateTenant,
  type AdminSession,
  type CreateTenantPayload,
  type UpdateTenantPayload,
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

type TenantEditState = Readonly<{
  publicId: string;
  name: string;
  planSlug: "" | UpdateTenantPayload["planSlug"];
  defaultLocale: string;
  status: TenantRecord["status"];
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

const defaultTenantEditState = (tenant?: TenantRecord | null): TenantEditState => ({
  publicId: tenant?.publicId ?? "",
  name: tenant?.name ?? "",
  planSlug: "",
  defaultLocale: tenant?.defaultLocale ?? "pt-BR",
  status: tenant?.status ?? "active"
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
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [loginState, setLoginState] = useState<LoginState>(defaultLoginState);
  const [tenantForm, setTenantForm] = useState<TenantFormState>(defaultTenantFormState);
  const [tenantEdit, setTenantEdit] = useState<TenantEditState>(defaultTenantEditState());
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
      setSelectedTenantId(null);
      return;
    }

    void loadTenants(session);
  }, [session]);

  useEffect(() => {
    if (tenants.length === 0) {
      setSelectedTenantId(null);
      setTenantEdit(defaultTenantEditState());
      return;
    }

    setSelectedTenantId((current) => {
      if (current && tenants.some((tenant) => tenant.id === current)) {
        return current;
      }

      return tenants[0]?.id ?? null;
    });
  }, [tenants]);

  useEffect(() => {
    const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId) ?? null;
    setTenantEdit(defaultTenantEditState(selectedTenant));
  }, [selectedTenantId, tenants]);

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

      setSelectedTenantId(null);
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

  const handleSelectTenant = (tenant: TenantRecord) => {
    setSelectedTenantId(tenant.id);
  };

  const handleUpdateTenantSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId);
    if (!session || !selectedTenant) {
      return;
    }

    setViewState((current) => ({ ...current, loading: true, error: null, notice: null }));

    try {
      const payload: UpdateTenantPayload = {
        publicId: tenantEdit.publicId,
        name: tenantEdit.name,
        defaultLocale: tenantEdit.defaultLocale,
        status: tenantEdit.status
      };

      if (tenantEdit.planSlug) {
        payload.planSlug = tenantEdit.planSlug;
      }

      await withSessionRetry((accessToken) => updateTenant(accessToken, selectedTenant.id, payload));
      await loadTenants();
      updateNotice("Tenant atualizado com sucesso.");
    } catch (error) {
      setViewState((current) => ({ ...current, loading: false }));

      if (error instanceof ApiError && error.status === 401) {
        setSession(null);
        setTenants([]);
        setSelectedTenantId(null);
        updateError("Sessao expirada. Entre novamente.");
        return;
      }

      updateError(error instanceof Error ? error.message : "Falha ao atualizar tenant");
    }
  };

  const handleSuspendTenant = async () => {
    const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId);
    if (!session || !selectedTenant) {
      return;
    }

    try {
      if (typeof window.confirm === "function") {
        try {
          if (!window.confirm(`Suspender ${selectedTenant.name}?`)) {
            return;
          }
        } catch {
          // Fallback for test environments that do not implement confirm.
        }
      }

      setViewState((current) => ({ ...current, loading: true, error: null, notice: null }));
      await withSessionRetry((accessToken) => deleteTenant(accessToken, selectedTenant.id));
      setSelectedTenantId(null);
      await loadTenants();
      updateNotice("Tenant suspenso com sucesso.");
    } catch (error) {
      setViewState((current) => ({ ...current, loading: false }));

      if (error instanceof ApiError && error.status === 401) {
        setSession(null);
        setTenants([]);
        setSelectedTenantId(null);
        updateError("Sessao expirada. Entre novamente.");
        return;
      }

      updateError(error instanceof Error ? error.message : "Falha ao suspender tenant");
    }
  };

  const canSubmitTenant = Boolean(tenantForm.publicId.trim() && tenantForm.name.trim() && session);
  const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId) ?? tenants[0] ?? null;
  const totalActiveTenants = tenants.filter((tenant) => tenant.status === "active").length;
  const totalSuspendedTenants = tenants.filter((tenant) => tenant.status === "suspended").length;
  const selectedTenantSnippet = selectedTenant ? buildWidgetSnippet(selectedTenant.publicId) : null;

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
                        <span>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => handleSelectTenant(tenant)}
                          >
                            Editar
                          </button>
                        </span>
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

            {selectedTenant ? (
              <section className="surface tenant-detail" id="tenant-detail">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Tenant selecionado</p>
                    <h2>{selectedTenant.name}</h2>
                  </div>
                  <div className="header-actions">
                    <button type="button" className="secondary danger" onClick={handleSuspendTenant}>
                      Suspender tenant
                    </button>
                  </div>
                </div>

                <dl className="session-grid tenant-summary">
                  <div>
                    <dt>Public ID</dt>
                    <dd className="mono">{selectedTenant.publicId}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{formatTenantStatus(selectedTenant.status)}</dd>
                  </div>
                  <div>
                    <dt>Plano</dt>
                    <dd>{getPlanLabel(selectedTenant.planId)}</dd>
                  </div>
                </dl>

                <form className="stack" onSubmit={handleUpdateTenantSubmit}>
                  <div className="two-column compact">
                    <label>
                      <span>Public ID</span>
                      <input
                        value={tenantEdit.publicId}
                        onChange={(event) =>
                          setTenantEdit((current) => ({ ...current, publicId: event.target.value }))
                        }
                        placeholder="acme"
                        required
                      />
                    </label>

                    <label>
                      <span>Nome</span>
                      <input
                        value={tenantEdit.name}
                        onChange={(event) =>
                          setTenantEdit((current) => ({ ...current, name: event.target.value }))
                        }
                        placeholder="Acme Ltda"
                        required
                      />
                    </label>
                  </div>

                  <div className="two-column compact">
                    <label>
                      <span>Plano</span>
                      <select
                        value={tenantEdit.planSlug}
                        onChange={(event) =>
                          setTenantEdit((current) => ({
                            ...current,
                            planSlug: event.target.value as TenantEditState["planSlug"]
                          }))
                        }
                      >
                        <option value="">Manter plano atual</option>
                        <option value="free">Free</option>
                        <option value="starter">Starter</option>
                        <option value="growth">Growth</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </label>

                    <label>
                      <span>Status</span>
                      <select
                        value={tenantEdit.status}
                        onChange={(event) =>
                          setTenantEdit((current) => ({
                            ...current,
                            status: event.target.value as TenantRecord["status"]
                          }))
                        }
                      >
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                        <option value="suspended">Suspenso</option>
                      </select>
                    </label>
                  </div>

                  <label>
                    <span>Locale padrao</span>
                    <input
                      value={tenantEdit.defaultLocale}
                      onChange={(event) =>
                        setTenantEdit((current) => ({ ...current, defaultLocale: event.target.value }))
                      }
                      placeholder="pt-BR"
                      required
                    />
                  </label>

                  <button type="submit" className="primary" disabled={viewState.loading}>
                    {viewState.loading ? "Salvando..." : "Salvar alteracoes"}
                  </button>
                </form>
              </section>
            ) : null}

            <section className="surface widget-card" id="widget">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Widget</p>
                  <h2>Snippet de instalacao</h2>
                </div>
              </div>

              {selectedTenantSnippet ? (
                <>
                  <p>Snippet gerado para o tenant selecionado.</p>
                  <pre>{selectedTenantSnippet}</pre>
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
