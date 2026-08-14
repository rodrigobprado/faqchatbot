import { useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  buildWidgetSnippet,
  deleteTenant,
  createTenantDomain,
  createTenant,
  getTenantAgentConfig,
  getTenantConfig,
  listTenants,
  listTenantDomains,
  loginAdmin,
  refreshAdmin,
  updateTenant,
  upsertTenantAgentConfig,
  upsertTenantConfig,
  type AdminSession,
  type CreateTenantPayload,
  type TenantAgentConfigPayload,
  type TenantAgentConfigRecord,
  type TenantConfigPayload,
  type TenantConfigRecord,
  type TenantDomainRecord,
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

type TenantWidgetConfigState = Readonly<{
  theme: TenantConfigRecord["theme"];
  primaryColor: string;
  iconUrl: string;
  initialMessage: string;
  placeholder: string;
}>;

type TenantAgentConfigState = Readonly<{
  provider: TenantAgentConfigRecord["provider"];
  model: string;
  webhookEndpointId: string;
  encryptedCredentialsRef: string;
  routingRules: string;
  timeoutMs: string;
  retryPolicy: string;
  isActive: boolean;
}>;

type TenantUserStatus = "active" | "invited" | "suspended";

type TenantUserRecord = Readonly<{
  id: string;
  email: string;
  status: TenantUserStatus;
  roles: string[];
  invitedAt: string;
}>;

type TenantRoleRecord = Readonly<{
  id: string;
  slug: string;
  name: string;
  description: string;
  permissions: string[];
}>;

type TenantApiKeyRecord = Readonly<{
  id: string;
  name: string;
  prefix: string;
  last4: string;
  createdAt: string;
  revokedAt: string | null;
}>;

type TenantAccessState = Readonly<{
  users: TenantUserRecord[];
  roles: TenantRoleRecord[];
  apiKeys: TenantApiKeyRecord[];
  pendingSecret: string | null;
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

const defaultTenantWidgetConfigState = (config?: TenantConfigRecord | null): TenantWidgetConfigState => ({
  theme: config?.theme ?? "auto",
  primaryColor: config?.primaryColor ?? "#2563eb",
  iconUrl: config?.iconUrl ?? "",
  initialMessage: config?.initialMessage ?? "Ola! Como posso ajudar?",
  placeholder: config?.placeholder ?? "Digite sua mensagem"
});

const stringifyJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

const defaultTenantAgentConfigState = (config?: TenantAgentConfigRecord | null): TenantAgentConfigState => ({
  provider: config?.provider ?? "n8n",
  model: config?.model ?? "",
  webhookEndpointId: config?.webhookEndpointId ?? "",
  encryptedCredentialsRef: config?.encryptedCredentialsRef ?? "",
  routingRules: stringifyJson(config?.routingRules),
  timeoutMs: String(config?.timeoutMs ?? 15000),
  retryPolicy: stringifyJson(config?.retryPolicy),
  isActive: config?.isActive ?? true
});

const accessPermissionCatalog = [
  "Visualizar conversas",
  "Responder conversas",
  "Invitar usuarios",
  "Gerenciar roles",
  "Criar api keys",
  "Revogar api keys"
];

const defaultTenantAccessState = (session: AdminSession | null, tenant?: TenantRecord | null): TenantAccessState => {
  const baseEmail = session?.user.email ?? "admin@empresa.com";
  const suffix = tenant?.publicId ?? "tenant";

  return {
    users: [
      {
        id: `${suffix}-user-admin`,
        email: baseEmail,
        status: "active",
        roles: ["admin", "platform_admin"],
        invitedAt: new Date().toISOString()
      },
      {
        id: `${suffix}-user-support`,
        email: `support@${tenant?.publicId ?? "exemplo"}.com`,
        status: "invited",
        roles: ["viewer"],
        invitedAt: new Date().toISOString()
      }
    ],
    roles: [
      {
        id: `${suffix}-role-admin`,
        slug: "admin",
        name: "Administrator",
        description: "Acesso total ao tenant, exceto configuracoes da plataforma.",
        permissions: [
          "Visualizar conversas",
          "Responder conversas",
          "Invitar usuarios",
          "Gerenciar roles",
          "Criar api keys",
          "Revogar api keys"
        ]
      },
      {
        id: `${suffix}-role-editor`,
        slug: "editor",
        name: "Editor",
        description: "Atua no atendimento e na operacao cotidiana.",
        permissions: ["Visualizar conversas", "Responder conversas"]
      },
      {
        id: `${suffix}-role-viewer`,
        slug: "viewer",
        name: "Viewer",
        description: "Acompanha a operacao sem modificar dados sensiveis.",
        permissions: ["Visualizar conversas"]
      },
      {
        id: `${suffix}-role-operator`,
        slug: "operator",
        name: "Operator",
        description: "Gerencia integracoes e chaves de API do tenant.",
        permissions: ["Visualizar conversas", "Criar api keys", "Revogar api keys"]
      }
    ],
    apiKeys: [
      {
        id: `${suffix}-key-1`,
        name: "Dashboard service key",
        prefix: "fqc_dash",
        last4: "19ab",
        createdAt: new Date().toISOString(),
        revokedAt: null
      }
    ],
    pendingSecret: null
  };
};

const makeLocalId = (prefix: string) => {
  const randomPart = Math.random().toString(36).slice(2, 8);
  const timePart = Date.now().toString(36);
  return `${prefix}-${randomPart}-${timePart}`;
};

const makeApiKeySecret = () => `fqc_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;

const parseJsonObject = (input: string, label: string): Record<string, unknown> => {
  if (!input.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(input);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("Invalid JSON object");
    }

    return parsed as Record<string, unknown>;
  } catch {
    throw new Error(`${label} deve conter um JSON valido.`);
  }
};

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

const agentProviderOptions = [
  { value: "n8n", label: "n8n" },
  { value: "openai_responses", label: "OpenAI Responses" },
  { value: "langgraph", label: "LangGraph" },
  { value: "flowise", label: "Flowise" },
  { value: "dify", label: "Dify" },
  { value: "crewai", label: "CrewAI" },
  { value: "mcp", label: "MCP" },
  { value: "custom", label: "Custom" }
] as const;

export const App = () => {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantDomains, setTenantDomains] = useState<TenantDomainRecord[]>([]);
  const [loginState, setLoginState] = useState<LoginState>(defaultLoginState);
  const [tenantForm, setTenantForm] = useState<TenantFormState>(defaultTenantFormState);
  const [tenantEdit, setTenantEdit] = useState<TenantEditState>(defaultTenantEditState());
  const [domainForm, setDomainForm] = useState("");
  const [widgetConfig, setWidgetConfig] = useState<TenantWidgetConfigState>(
    defaultTenantWidgetConfigState(),
  );
  const [tenantAgentConfig, setTenantAgentConfig] = useState<TenantAgentConfigState>(
    defaultTenantAgentConfigState(),
  );
  const [tenantAccessById, setTenantAccessById] = useState<Record<string, TenantAccessState>>({});
  const [userInviteForm, setUserInviteForm] = useState({ email: "", roleSlug: "viewer" });
  const [keyForm, setKeyForm] = useState({ name: "" });
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
      setTenantDomains([]);
      setDomainForm("");
      setWidgetConfig(defaultTenantWidgetConfigState());
      setTenantAgentConfig(defaultTenantAgentConfigState());
      setTenantAccessById({});
      setUserInviteForm({ email: "", roleSlug: "viewer" });
      setKeyForm({ name: "" });
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

  useEffect(() => {
    const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId) ?? null;

    if (!session || !selectedTenant) {
      setTenantDomains([]);
      setDomainForm("");
      setWidgetConfig(defaultTenantWidgetConfigState());
      setTenantAgentConfig(defaultTenantAgentConfigState());
      setUserInviteForm({ email: "", roleSlug: "viewer" });
      setKeyForm({ name: "" });
      return;
    }

    void loadTenantDetails(selectedTenant.id);
  }, [selectedTenantId, tenants, session]);

  useEffect(() => {
    const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId) ?? null;
    if (!session || !selectedTenant) {
      return;
    }

    setTenantAccessById((current) => {
      if (current[selectedTenant.id]) {
        return current;
      }

      return {
        ...current,
        [selectedTenant.id]: defaultTenantAccessState(session, selectedTenant)
      };
    });
  }, [selectedTenantId, tenants, session]);

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

  const loadTenantDetails = async (tenantId: string) => {
    if (!session) {
      return;
    }

    setViewState((current) => ({ ...current, loading: true, error: null }));

    try {
      const [domains, config, agentConfig] = await withSessionRetry(async (accessToken) => {
        const [nextDomains, nextConfig, nextAgentConfig] = await Promise.all([
          listTenantDomains(accessToken, tenantId),
          getTenantConfig(accessToken, tenantId),
          getTenantAgentConfig(accessToken, tenantId)
        ]);

        return [nextDomains, nextConfig, nextAgentConfig] as const;
      });

      setTenantDomains(domains);
      setDomainForm("");
      setWidgetConfig(defaultTenantWidgetConfigState(config));
      setTenantAgentConfig(defaultTenantAgentConfigState(agentConfig));
      setViewState((current) => ({
        ...current,
        loading: false
      }));
    } catch (error) {
      setViewState((current) => ({ ...current, loading: false }));

      if (error instanceof ApiError && error.status === 401) {
        setSession(null);
        setTenants([]);
        setTenantDomains([]);
        setTenantAgentConfig(defaultTenantAgentConfigState());
        setSelectedTenantId(null);
        updateError("Sessao expirada. Entre novamente.");
        return;
      }

      updateError(error instanceof Error ? error.message : "Falha ao carregar detalhes do tenant");
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
    setTenantAgentConfig(defaultTenantAgentConfigState());
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

  const handleCreateDomainSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId);
    if (!session || !selectedTenant) {
      return;
    }

    setViewState((current) => ({ ...current, loading: true, error: null, notice: null }));

    try {
      await withSessionRetry((accessToken) =>
        createTenantDomain(accessToken, selectedTenant.id, domainForm.trim()),
      );
      await loadTenantDetails(selectedTenant.id);
      updateNotice("Dominio autorizado com sucesso.");
    } catch (error) {
      setViewState((current) => ({ ...current, loading: false }));

      if (error instanceof ApiError && error.status === 401) {
        setSession(null);
        setTenants([]);
        setTenantDomains([]);
        setSelectedTenantId(null);
        updateError("Sessao expirada. Entre novamente.");
        return;
      }

      updateError(error instanceof Error ? error.message : "Falha ao cadastrar dominio");
    }
  };

  const handleSaveWidgetConfigSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId);
    if (!session || !selectedTenant) {
      return;
    }

    setViewState((current) => ({ ...current, loading: true, error: null, notice: null }));

    try {
      const payload: TenantConfigPayload = {
        theme: widgetConfig.theme,
        primaryColor: widgetConfig.primaryColor,
        iconUrl: widgetConfig.iconUrl.trim() || null,
        initialMessage: widgetConfig.initialMessage,
        placeholder: widgetConfig.placeholder
      };

      await withSessionRetry((accessToken) => upsertTenantConfig(accessToken, selectedTenant.id, payload));
      await loadTenantDetails(selectedTenant.id);
      updateNotice("Configuracao do widget salva com sucesso.");
    } catch (error) {
      setViewState((current) => ({ ...current, loading: false }));

      if (error instanceof ApiError && error.status === 401) {
        setSession(null);
        setTenants([]);
        setTenantDomains([]);
        setSelectedTenantId(null);
        updateError("Sessao expirada. Entre novamente.");
        return;
      }

      updateError(error instanceof Error ? error.message : "Falha ao salvar configuracao do widget");
    }
  };

  const handleSaveAgentConfigSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId);
    if (!session || !selectedTenant) {
      return;
    }

    setViewState((current) => ({ ...current, loading: true, error: null, notice: null }));

    try {
      const timeoutMs = Number.parseInt(tenantAgentConfig.timeoutMs, 10);
      if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
        throw new Error("Timeout deve ser um numero inteiro positivo.");
      }

      const payload: TenantAgentConfigPayload = {
        provider: tenantAgentConfig.provider,
        model: tenantAgentConfig.model.trim() || null,
        webhookEndpointId: tenantAgentConfig.webhookEndpointId.trim() || null,
        encryptedCredentialsRef: tenantAgentConfig.encryptedCredentialsRef.trim() || null,
        routingRules: parseJsonObject(tenantAgentConfig.routingRules, "Routing rules"),
        timeoutMs,
        retryPolicy: parseJsonObject(tenantAgentConfig.retryPolicy, "Retry policy"),
        isActive: tenantAgentConfig.isActive
      };

      await withSessionRetry((accessToken) =>
        upsertTenantAgentConfig(accessToken, selectedTenant.id, payload),
      );
      await loadTenantDetails(selectedTenant.id);
      updateNotice("Configuracao de agente salva com sucesso.");
    } catch (error) {
      setViewState((current) => ({ ...current, loading: false }));

      if (error instanceof ApiError && error.status === 401) {
        setSession(null);
        setTenants([]);
        setTenantDomains([]);
        setTenantAgentConfig(defaultTenantAgentConfigState());
        setSelectedTenantId(null);
        updateError("Sessao expirada. Entre novamente.");
        return;
      }

      updateError(error instanceof Error ? error.message : "Falha ao salvar configuracao de agente");
    }
  };

  const handleInviteUserSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId);
    if (!session || !selectedTenant) {
      return;
    }

    const email = userInviteForm.email.trim();
    if (!email) {
      updateError("E-mail do usuario e obrigatorio.");
      return;
    }

    const invitedUser: TenantUserRecord = {
      id: makeLocalId("user"),
      email,
      status: "invited",
      roles: [userInviteForm.roleSlug],
      invitedAt: new Date().toISOString()
    };

    setTenantAccessById((current) => ({
      ...current,
      [selectedTenant.id]: {
        ...(current[selectedTenant.id] ?? defaultTenantAccessState(session, selectedTenant)),
        users: [invitedUser, ...(current[selectedTenant.id]?.users ?? defaultTenantAccessState(session, selectedTenant).users)]
      }
    }));
    setUserInviteForm({ email: "", roleSlug: "viewer" });
    updateNotice("Convite de usuario preparado localmente.");
  };

  const handleUpdateUserRoles = (userId: string, roleSlug: string) => {
    const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId);
    if (!session || !selectedTenant) {
      return;
    }

    setTenantAccessById((current) => {
      const currentAccess = current[selectedTenant.id] ?? defaultTenantAccessState(session, selectedTenant);
      return {
        ...current,
        [selectedTenant.id]: {
          ...currentAccess,
          users: currentAccess.users.map((user) =>
            user.id === userId
              ? {
                  ...user,
                  roles: Array.from(new Set([...user.roles.filter((slug) => slug !== roleSlug), roleSlug]))
                }
              : user,
          )
        }
      };
    });

    updateNotice("Roles do usuario atualizados localmente.");
  };

  const handleCreateApiKeySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId);
    if (!session || !selectedTenant) {
      return;
    }

    const name = keyForm.name.trim();
    if (!name) {
      updateError("Nome da chave e obrigatorio.");
      return;
    }

    const secret = makeApiKeySecret();
    const nextKey: TenantApiKeyRecord = {
      id: makeLocalId("api-key"),
      name,
      prefix: secret.slice(0, 8),
      last4: secret.slice(-4),
      createdAt: new Date().toISOString(),
      revokedAt: null
    };

    setTenantAccessById((current) => {
      const currentAccess = current[selectedTenant.id] ?? defaultTenantAccessState(session, selectedTenant);
      return {
        ...current,
        [selectedTenant.id]: {
          ...currentAccess,
          apiKeys: [nextKey, ...currentAccess.apiKeys],
          pendingSecret: secret
        }
      };
    });
    setKeyForm({ name: "" });
    updateNotice("Chave criada. O segredo fica visivel apenas agora.");
  };

  const handleRevokeApiKey = (keyId: string) => {
    const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId);
    if (!session || !selectedTenant) {
      return;
    }

    setTenantAccessById((current) => {
      const currentAccess = current[selectedTenant.id] ?? defaultTenantAccessState(session, selectedTenant);
      return {
        ...current,
        [selectedTenant.id]: {
          ...currentAccess,
          apiKeys: currentAccess.apiKeys.map((key) =>
            key.id === keyId ? { ...key, revokedAt: new Date().toISOString() } : key,
          )
        }
      };
    });

    updateNotice("Chave revogada localmente.");
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
        setTenantAgentConfig(defaultTenantAgentConfigState());
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
  const canSubmitDomain = Boolean(session && selectedTenant && domainForm.trim());
  const domainLabel = tenantDomains.length === 0 ? "Nenhum dominio cadastrado" : `${tenantDomains.length} dominio(s)`;
  const selectedTenantAccess = selectedTenant
    ? tenantAccessById[selectedTenant.id] ?? defaultTenantAccessState(session, selectedTenant)
    : null;

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
          <a href="#agent-config">Agente</a>
          <a href="#users">Usuarios</a>
          <a href="#roles">Roles</a>
          <a href="#api-keys">API keys</a>
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

            {selectedTenant ? (
              <section className="two-column">
                <article className="surface domain-card" id="domains">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">Seguranca</p>
                      <h2>Dominios autorizados</h2>
                    </div>
                    <strong>{domainLabel}</strong>
                  </div>

                  <form className="stack" onSubmit={handleCreateDomainSubmit}>
                    <label>
                      <span>Novo dominio</span>
                      <input
                        value={domainForm}
                        onChange={(event) => setDomainForm(event.target.value)}
                        placeholder="exemplo.com"
                        required
                      />
                    </label>

                    <button type="submit" className="primary" disabled={viewState.loading || !canSubmitDomain}>
                      {viewState.loading ? "Salvando..." : "Adicionar dominio"}
                    </button>
                  </form>

                  <div className="list-card">
                    {tenantDomains.length === 0 ? (
                      <p>Nenhum dominio autorizado ainda.</p>
                    ) : (
                      tenantDomains.map((domain) => (
                        <div className="list-row" key={domain.id}>
                          <span className="mono">{domain.domain}</span>
                          <span>{domain.isVerified ? "Verificado" : "Pendente"}</span>
                        </div>
                      ))
                    )}
                  </div>
                </article>

                <article className="surface widget-config-card" id="widget-config">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">Widget</p>
                      <h2>Configuracao publica</h2>
                    </div>
                  </div>

                  <form className="stack" onSubmit={handleSaveWidgetConfigSubmit}>
                    <label>
                      <span>Tema</span>
                      <select
                        value={widgetConfig.theme}
                        onChange={(event) =>
                          setWidgetConfig((current) => ({
                            ...current,
                            theme: event.target.value as TenantWidgetConfigState["theme"]
                          }))
                        }
                      >
                        <option value="auto">Auto</option>
                        <option value="light">Claro</option>
                        <option value="dark">Escuro</option>
                      </select>
                    </label>

                    <label>
                      <span>Cor primaria</span>
                      <input
                        value={widgetConfig.primaryColor}
                        onChange={(event) =>
                          setWidgetConfig((current) => ({
                            ...current,
                            primaryColor: event.target.value
                          }))
                        }
                        placeholder="#2563eb"
                        required
                      />
                    </label>

                    <label>
                      <span>URL do icone</span>
                      <input
                        value={widgetConfig.iconUrl}
                        onChange={(event) =>
                          setWidgetConfig((current) => ({
                            ...current,
                            iconUrl: event.target.value
                          }))
                        }
                        placeholder="https://cdn.exemplo.com/icon.png"
                      />
                    </label>

                    <label>
                      <span>Mensagem inicial</span>
                      <input
                        value={widgetConfig.initialMessage}
                        onChange={(event) =>
                          setWidgetConfig((current) => ({
                            ...current,
                            initialMessage: event.target.value
                          }))
                        }
                        placeholder="Ola! Como posso ajudar?"
                        required
                      />
                    </label>

                    <label>
                      <span>Placeholder</span>
                      <input
                        value={widgetConfig.placeholder}
                        onChange={(event) =>
                          setWidgetConfig((current) => ({
                            ...current,
                            placeholder: event.target.value
                          }))
                        }
                        placeholder="Digite sua mensagem"
                        required
                      />
                    </label>

                    <button type="submit" className="primary" disabled={viewState.loading}>
                      {viewState.loading ? "Salvando..." : "Salvar widget"}
                    </button>
                  </form>
                </article>
              </section>
            ) : null}

            {selectedTenant ? (
              <section className="surface agent-config-card" id="agent-config">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Agente</p>
                    <h2>Configuracao de agente</h2>
                  </div>
                </div>

                <dl className="session-grid agent-summary">
                  <div>
                    <dt>Provider</dt>
                    <dd>{tenantAgentConfig.provider}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{tenantAgentConfig.isActive ? "Ativo" : "Inativo"}</dd>
                  </div>
                  <div>
                    <dt>Timeout</dt>
                    <dd>{tenantAgentConfig.timeoutMs} ms</dd>
                  </div>
                </dl>

                <form className="stack" onSubmit={handleSaveAgentConfigSubmit}>
                  <div className="two-column compact">
                    <label>
                      <span>Provider</span>
                      <select
                        value={tenantAgentConfig.provider}
                        onChange={(event) =>
                          setTenantAgentConfig((current) => ({
                            ...current,
                            provider: event.target.value as TenantAgentConfigState["provider"]
                          }))
                        }
                      >
                        {agentProviderOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span>Modelo</span>
                      <input
                        value={tenantAgentConfig.model}
                        onChange={(event) =>
                          setTenantAgentConfig((current) => ({ ...current, model: event.target.value }))
                        }
                        placeholder="gpt-4.1-mini"
                      />
                    </label>
                  </div>

                  <div className="two-column compact">
                    <label>
                      <span>Webhook endpoint ID</span>
                      <input
                        value={tenantAgentConfig.webhookEndpointId}
                        onChange={(event) =>
                          setTenantAgentConfig((current) => ({
                            ...current,
                            webhookEndpointId: event.target.value
                          }))
                        }
                        placeholder="UUID do webhook"
                      />
                    </label>

                    <label>
                      <span>Credenciais referenciadas</span>
                      <input
                        value={tenantAgentConfig.encryptedCredentialsRef}
                        onChange={(event) =>
                          setTenantAgentConfig((current) => ({
                            ...current,
                            encryptedCredentialsRef: event.target.value
                          }))
                        }
                        placeholder="vault://tenant-agent-secret"
                      />
                    </label>
                  </div>

                  <div className="two-column compact">
                    <label>
                      <span>Timeout em ms</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={tenantAgentConfig.timeoutMs}
                        onChange={(event) =>
                          setTenantAgentConfig((current) => ({ ...current, timeoutMs: event.target.value }))
                        }
                        placeholder="15000"
                        required
                      />
                    </label>

                    <label className="checkbox-field">
                      <span>Ativo</span>
                      <input
                        type="checkbox"
                        checked={tenantAgentConfig.isActive}
                        onChange={(event) =>
                          setTenantAgentConfig((current) => ({
                            ...current,
                            isActive: event.target.checked
                          }))
                        }
                      />
                    </label>
                  </div>

                  <label>
                    <span>Routing rules (JSON)</span>
                    <textarea
                      rows={5}
                      value={tenantAgentConfig.routingRules}
                      onChange={(event) =>
                        setTenantAgentConfig((current) => ({
                          ...current,
                          routingRules: event.target.value
                        }))
                      }
                      placeholder='{"fallback":"n8n"}'
                    />
                  </label>

                  <label>
                    <span>Retry policy (JSON)</span>
                    <textarea
                      rows={5}
                      value={tenantAgentConfig.retryPolicy}
                      onChange={(event) =>
                        setTenantAgentConfig((current) => ({
                          ...current,
                          retryPolicy: event.target.value
                        }))
                      }
                      placeholder='{"attempts":2}'
                    />
                  </label>

                  <button type="submit" className="primary" disabled={viewState.loading}>
                    {viewState.loading ? "Salvando..." : "Salvar agente"}
                  </button>
                </form>
              </section>
            ) : null}

            {selectedTenant && selectedTenantAccess ? (
              <section className="three-column access-grid">
                <article className="surface access-card" id="users">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">Equipe</p>
                      <h2>Usuarios do tenant</h2>
                    </div>
                  </div>

                  <form className="stack" onSubmit={handleInviteUserSubmit}>
                    <label>
                      <span>E-mail</span>
                      <input
                        value={userInviteForm.email}
                        onChange={(event) =>
                          setUserInviteForm((current) => ({ ...current, email: event.target.value }))
                        }
                        placeholder="usuario@empresa.com"
                        required
                      />
                    </label>

                    <label>
                      <span>Role inicial</span>
                      <select
                        value={userInviteForm.roleSlug}
                        onChange={(event) =>
                          setUserInviteForm((current) => ({ ...current, roleSlug: event.target.value }))
                        }
                      >
                        {selectedTenantAccess.roles.map((role) => (
                          <option key={role.slug} value={role.slug}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button type="submit" className="primary">
                      Preparar convite
                    </button>
                  </form>

                  <div className="list-card">
                    {selectedTenantAccess.users.map((user) => (
                      <div className="user-row" key={user.id}>
                        <div>
                          <strong>{user.email}</strong>
                          <p>{user.status === "active" ? "Ativo" : user.status === "invited" ? "Convidado" : "Suspenso"}</p>
                          <small>Convidado em {new Date(user.invitedAt).toLocaleDateString("pt-BR")}</small>
                        </div>
                        <div className="user-actions">
                          <select
                            value={user.roles[0] ?? "viewer"}
                            onChange={(event) => handleUpdateUserRoles(user.id, event.target.value)}
                          >
                            {selectedTenantAccess.roles.map((role) => (
                              <option key={role.slug} value={role.slug}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                          <div className="chip-row">
                            {user.roles.map((roleSlug) => (
                              <span className="chip" key={roleSlug}>
                                {roleSlug}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="surface access-card" id="roles">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">Acesso</p>
                      <h2>Roles e permissoes</h2>
                    </div>
                  </div>

                  <div className="list-card">
                    {selectedTenantAccess.roles.map((role) => (
                      <div className="role-row" key={role.id}>
                        <div>
                          <strong>{role.name}</strong>
                          <p className="mono">{role.slug}</p>
                          <small>{role.description}</small>
                        </div>
                        <div className="chip-grid">
                          {role.permissions.map((permission) => (
                            <span className="chip" key={permission}>
                              {permission}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="list-card permission-card">
                    <strong>Catálogo principal</strong>
                    <div className="chip-grid">
                      {accessPermissionCatalog.map((permission) => (
                        <span className="chip" key={permission}>
                          {permission}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>

                <article className="surface access-card" id="api-keys">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">Credenciais</p>
                      <h2>API keys</h2>
                    </div>
                  </div>

                  {selectedTenantAccess.pendingSecret ? (
                    <div className="banner success secret-banner">
                      <strong>Segredo gerado uma unica vez</strong>
                      <code>{selectedTenantAccess.pendingSecret}</code>
                    </div>
                  ) : null}

                  <form className="stack" onSubmit={handleCreateApiKeySubmit}>
                    <label>
                      <span>Nome da chave</span>
                      <input
                        value={keyForm.name}
                        onChange={(event) => setKeyForm((current) => ({ ...current, name: event.target.value }))}
                        placeholder="Key do painel"
                        required
                      />
                    </label>

                    <button type="submit" className="primary">
                      Criar chave
                    </button>
                  </form>

                  <div className="list-card">
                    {selectedTenantAccess.apiKeys.map((key) => (
                      <div className="api-key-row" key={key.id}>
                        <div>
                          <strong>{key.name}</strong>
                          <p>
                            {key.prefix}...{key.last4}
                          </p>
                          <small>
                            {key.revokedAt ? `Revogada em ${new Date(key.revokedAt).toLocaleDateString("pt-BR")}` : "Ativa"}
                          </small>
                        </div>
                        <button
                          type="button"
                          className="secondary danger"
                          onClick={() => handleRevokeApiKey(key.id)}
                          disabled={Boolean(key.revokedAt)}
                        >
                          Revogar
                        </button>
                      </div>
                    ))}
                  </div>
                </article>
              </section>
            ) : null}

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
