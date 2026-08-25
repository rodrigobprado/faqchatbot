import { useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  buildWidgetSnippet,
  createPlan,
  updatePlan as updatePlanRequest,
  deletePlan,
  createTenantApiKey,
  deleteTenant,
  deleteTenantDomain,
  createTenantDomain,
  createTenant,
  getPlatformHealth,
  getTenantAgentConfig,
  getTenantConfig,
  getTenantConversation,
  inviteTenantUser,
  listPlans,
  listTenants,
  listTenantAnalytics,
  listTenantAuditLogs,
  listTenantConversations,
  listTenantApiKeys,
  listTenantSessions,
  listTenantRoles,
  listTenantUsers,
  listTenantDomains,
  listTenantSystemLogs,
  loginAdmin,
  refreshAdmin,
  revokeTenantApiKey,
  updateTenant,
  updateTenantUserStatus,
  updateTenantUserRoles,
  upsertTenantAgentConfig,
  upsertTenantConfig,
  type AdminSession,
  type CreateTenantPayload,
  type TenantAgentConfigPayload,
  type TenantAgentConfigRecord,
  type TenantApiKeyRecord,
  type TenantAnalyticsReport,
  type TenantAuditLogRecord,
  type TenantConfigPayload,
  type TenantConfigRecord,
  type TenantDomainRecord,
  type TenantConversationDetailRecord,
  type TenantConversationRecord,
  type TenantSessionRecord,
  type PlanRecord,
  type TenantRoleRecord,
  type PlatformHealthRecord,
  type TenantSystemLogRecord,
  type TenantUserRecord,
  type UpdateTenantPayload,
  type TenantRecord,
} from "./api.js";

const STORAGE_KEY = "faqchatbot.dashboard.session.v1";
const AUTH_EXPIRED_FLASH_KEY = "faqchatbot.dashboard.auth-expired";
const AUTH_EXPIRED_MESSAGE = "Sessao expirada. Entre novamente.";

type LoginState = Readonly<{
  email: string;
  password: string;
}>;

type TenantFormState = Readonly<{
  publicId: string;
  name: string;
  planId: CreateTenantPayload["planId"];
  defaultLocale: string;
}>;

type TenantEditState = Readonly<{
  publicId: string;
  name: string;
  planId: string;
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

type TenantAccessState = Readonly<{
  users: TenantUserRecord[];
  roles: TenantRoleRecord[];
  apiKeys: TenantApiKeyRecord[];
  pendingSecret: string | null;
}>;

type TenantConversationState = Readonly<{
  conversations: TenantConversationRecord[];
  selectedConversationId: string | null;
  selectedConversation: TenantConversationDetailRecord | null;
}>;

type TenantAnalyticsState = Readonly<{
  analytics: TenantAnalyticsReport | null;
  auditLogs: TenantAuditLogRecord[];
  systemLogs: TenantSystemLogRecord[];
}>;

type TenantStatusFilter = "" | TenantRecord["status"];
type TenantPlanFilter = string;

type TenantListFiltersState = Readonly<{
  search: string;
  status: TenantStatusFilter;
  planId: TenantPlanFilter;
}>;

type ViewState = Readonly<{
  loading: boolean;
  error: string | null;
  notice: string | null;
}>;

type DashboardSection = "overview" | "settings" | "plans" | "tenants" | "operations" | "access";
type TenantWorkspace = "list" | "create" | "details" | "widget" | "security" | "agent";
type OperationsWorkspace = "sessions" | "analytics" | "logs" | "conversations";
type AccessWorkspace = "users" | "roles" | "api-keys";

const defaultLoginState = (): LoginState => ({
  email: "",
  password: "",
});

const getDefaultPlanId = (plans: PlanRecord[]): TenantFormState["planId"] => {
  const starter = plans.find((plan) => plan.slug === "starter" && plan.isActive);
  if (starter) {
    return starter.id;
  }

  const activePlan = plans.find((plan) => plan.isActive);
  if (activePlan) {
    return activePlan.id;
  }

  return (plans[0]?.id ?? "") as TenantFormState["planId"];
};

const defaultTenantFormState = (plans: PlanRecord[] = []): TenantFormState => ({
  publicId: "",
  name: "",
  planId: getDefaultPlanId(plans),
  defaultLocale: "pt-BR",
});

const defaultTenantEditState = (tenant?: TenantRecord | null): TenantEditState => ({
  publicId: tenant?.publicId ?? "",
  name: tenant?.name ?? "",
  planId: (tenant?.planId ?? "") as TenantEditState["planId"],
  defaultLocale: tenant?.defaultLocale ?? "pt-BR",
  status: tenant?.status ?? "active",
});

const defaultTenantWidgetConfigState = (
  config?: TenantConfigRecord | null,
): TenantWidgetConfigState => ({
  theme: config?.theme ?? "auto",
  primaryColor: config?.primaryColor ?? "#2563eb",
  iconUrl: config?.iconUrl ?? "",
  initialMessage: config?.initialMessage ?? "Ola! Como posso ajudar?",
  placeholder: config?.placeholder ?? "Digite sua mensagem",
});

const stringifyJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

const defaultTenantAgentConfigState = (
  config?: TenantAgentConfigRecord | null,
): TenantAgentConfigState => ({
  provider: config?.provider ?? "n8n",
  model: config?.model ?? "",
  webhookEndpointId: config?.webhookEndpointId ?? "",
  encryptedCredentialsRef: config?.encryptedCredentialsRef ?? "",
  routingRules: stringifyJson(config?.routingRules),
  timeoutMs: String(config?.timeoutMs ?? 15000),
  retryPolicy: stringifyJson(config?.retryPolicy),
  isActive: config?.isActive ?? true,
});

const defaultTenantListFiltersState = (): TenantListFiltersState => ({
  search: "",
  status: "",
  planId: "",
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const accessPermissionCatalog = [
  "Visualizar conversas",
  "Responder conversas",
  "Invitar usuarios",
  "Gerenciar roles",
  "Criar api keys",
  "Revogar api keys",
];

const dashboardSections: ReadonlyArray<{
  id: DashboardSection;
  label: string;
  description: string;
}> = [
  {
    id: "overview",
    label: "Visao geral",
    description: "Resumo operacional e saude da plataforma",
  },
  {
    id: "settings",
    label: "Configuracoes",
    description: "Dominio, ambiente e parametros operacionais",
  },
  {
    id: "plans",
    label: "Planos",
    description: "Catalogo de planos cadastrados",
  },
  {
    id: "tenants",
    label: "Tenants",
    description: "Clientes, widgets e configuracoes do tenant",
  },
  {
    id: "operations",
    label: "Operacao",
    description: "Sessoes, analytics, logs e conversas",
  },
  {
    id: "access",
    label: "Acesso",
    description: "Usuarios, roles e API keys",
  },
] as const;

const tenantWorkspaces: ReadonlyArray<{
  id: TenantWorkspace;
  label: string;
  description: string;
}> = [
  {
    id: "list",
    label: "Lista",
    description: "Pesquisar e selecionar tenants",
  },
  {
    id: "create",
    label: "Criar",
    description: "Cadastrar um novo tenant",
  },
  {
    id: "details",
    label: "Detalhes",
    description: "Editar o tenant selecionado",
  },
  {
    id: "widget",
    label: "Widget",
    description: "Snippet e configuração pública",
  },
  {
    id: "security",
    label: "Segurança",
    description: "Domínios autorizados",
  },
  {
    id: "agent",
    label: "Agente",
    description: "Provider, webhook e regras",
  },
] as const;

const operationsWorkspaces: ReadonlyArray<{
  id: OperationsWorkspace;
  label: string;
  description: string;
}> = [
  {
    id: "sessions",
    label: "Sessões",
    description: "Sessões do widget",
  },
  {
    id: "analytics",
    label: "Analytics",
    description: "Eventos e métricas",
  },
  {
    id: "logs",
    label: "Logs",
    description: "Auditoria e system logs",
  },
  {
    id: "conversations",
    label: "Conversas",
    description: "Histórico do atendimento",
  },
] as const;

const accessWorkspaces: ReadonlyArray<{
  id: AccessWorkspace;
  label: string;
  description: string;
}> = [
  {
    id: "users",
    label: "Usuários",
    description: "Convites e permissões",
  },
  {
    id: "roles",
    label: "Roles",
    description: "Catálogo de acessos",
  },
  {
    id: "api-keys",
    label: "API keys",
    description: "Credenciais do tenant",
  },
] as const;

const emptyTenantAccessState = (): TenantAccessState => ({
  users: [],
  roles: [],
  apiKeys: [],
  pendingSecret: null,
});

const emptyTenantConversationState = (): TenantConversationState => ({
  conversations: [],
  selectedConversationId: null,
  selectedConversation: null,
});

const emptyTenantAnalyticsState = (): TenantAnalyticsState => ({
  analytics: null,
  auditLogs: [],
  systemLogs: [],
});

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
    const parsed = JSON.parse(raw) as Partial<AdminSession> | null;
    if (
      !parsed ||
      typeof parsed.accessToken !== "string" ||
      parsed.accessToken.length === 0 ||
      typeof parsed.refreshToken !== "string" ||
      parsed.refreshToken.length === 0 ||
      !parsed.user ||
      typeof parsed.user.email !== "string" ||
      !Array.isArray(parsed.user.roles)
    ) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed as AdminSession;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
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

const getPlanDisplayName = (plans: PlanRecord[], planId: string) =>
  plans.find((plan) => plan.id === planId)?.name ?? planId;

const getPlanLabel = (plans: PlanRecord[], planId: string) => getPlanDisplayName(plans, planId);

const formatPlanPrice = (priceCents: number) =>
  priceCents <= 0 ? "Gratuito" : currencyFormatter.format(priceCents / 100);

const formatPlanLimits = (limits: PlanRecord["limits"]) => {
  const record = limits && typeof limits === "object" ? (limits as Record<string, unknown>) : {};
  const messagesPerMinute =
    typeof record.messagesPerMinute === "number" ? record.messagesPerMinute : null;
  const conversationsPerDay =
    typeof record.conversationsPerDay === "number" ? record.conversationsPerDay : null;

  return { messagesPerMinute, conversationsPerDay };
};

const normalizeTenantUser = (user: TenantUserRecord): TenantUserRecord =>
  ({
    ...user,
    invitedAt: user.invitedAt ?? user.createdAt ?? user.updatedAt ?? new Date().toISOString(),
  }) as TenantUserRecord;

const copyTextToClipboard = async (text: string) => {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard indisponivel");
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const copied = document.execCommand?.("copy") ?? false;
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("Falha ao copiar para a area de transferencia");
  }
};

const agentProviderOptions = [
  { value: "n8n", label: "n8n" },
  { value: "openai_responses", label: "OpenAI Responses" },
  { value: "langgraph", label: "LangGraph" },
  { value: "flowise", label: "Flowise" },
  { value: "dify", label: "Dify" },
  { value: "crewai", label: "CrewAI" },
  { value: "mcp", label: "MCP" },
  { value: "custom", label: "Custom" },
] as const;

export const App = () => {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantDomains, setTenantDomains] = useState<TenantDomainRecord[]>([]);
  const [loginState, setLoginState] = useState<LoginState>(defaultLoginState);
  const [planForm, setPlanForm] = useState({ slug: "", name: "", priceCents: "" });
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planEdit, setPlanEdit] = useState({ name: "", priceCents: "", isActive: true });
  const [tenantForm, setTenantForm] = useState<TenantFormState>(defaultTenantFormState());
  const [tenantEdit, setTenantEdit] = useState<TenantEditState>(
    defaultTenantEditState(undefined),
  );
  const [tenantFilters, setTenantFilters] = useState<TenantListFiltersState>(
    defaultTenantListFiltersState,
  );
  const [tenantPage, setTenantPage] = useState(0);
  const [domainForm, setDomainForm] = useState("");
  const [widgetConfig, setWidgetConfig] = useState<TenantWidgetConfigState>(
    defaultTenantWidgetConfigState(),
  );
  const [tenantAgentConfig, setTenantAgentConfig] = useState<TenantAgentConfigState>(
    defaultTenantAgentConfigState(),
  );
  const [tenantAccessById, setTenantAccessById] = useState<Record<string, TenantAccessState>>({});
  const [tenantConversationsById, setTenantConversationsById] = useState<
    Record<string, TenantConversationState>
  >({});
  const [tenantSessionsById, setTenantSessionsById] = useState<
    Record<string, TenantSessionRecord[]>
  >({});
  const [tenantInsightsById, setTenantInsightsById] = useState<
    Record<string, TenantAnalyticsState>
  >({});
  const [userInviteForm, setUserInviteForm] = useState({ email: "", roleSlug: "viewer" });
  const [keyForm, setKeyForm] = useState({ name: "" });
  const [platformHealth, setPlatformHealth] = useState<PlatformHealthRecord | null>(null);
  const [platformHealthStatus, setPlatformHealthStatus] = useState<"loading" | "ok" | "error">(
    "loading",
  );
  const [activeSection, setActiveSection] = useState<DashboardSection>("overview");
  const [tenantWorkspace, setTenantWorkspace] = useState<TenantWorkspace>("list");
  const [operationsWorkspace, setOperationsWorkspace] = useState<OperationsWorkspace>("sessions");
  const [accessWorkspace, setAccessWorkspace] = useState<AccessWorkspace>("users");
  const [viewState, setViewState] = useState<ViewState>({
    loading: false,
    error: null,
    notice: null,
  });

  useEffect(() => {
    setSession(readStoredSession());

    try {
      const authExpiredFlash = window.sessionStorage.getItem(AUTH_EXPIRED_FLASH_KEY);
      if (authExpiredFlash) {
        window.sessionStorage.removeItem(AUTH_EXPIRED_FLASH_KEY);
        setViewState((current) => ({ ...current, error: authExpiredFlash, notice: null }));
      }
    } catch {
      // sessionStorage indisponivel: segue sem mensagem flash.
    }
  }, []);

  useEffect(() => {
    let alive = true;

    const loadPlatformHealth = async () => {
      try {
        const health = await getPlatformHealth();
        if (!alive) {
          return;
        }

        setPlatformHealth(health);
        setPlatformHealthStatus("ok");
      } catch {
        if (!alive) {
          return;
        }

        setPlatformHealth(null);
        setPlatformHealthStatus("error");
      }
    };

    void loadPlatformHealth();

    return () => {
      alive = false;
    };
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
      setPlans([]);
      setSelectedTenantId(null);
      setActiveSection("overview");
      setTenantWorkspace("list");
      setOperationsWorkspace("sessions");
      setAccessWorkspace("users");
      setTenantFilters(defaultTenantListFiltersState());
      setTenantPage(0);
      setTenantDomains([]);
      setDomainForm("");
      setWidgetConfig(defaultTenantWidgetConfigState());
      setTenantAgentConfig(defaultTenantAgentConfigState());
      setTenantAccessById({});
      setTenantConversationsById({});
      setTenantSessionsById({});
      setTenantInsightsById({});
      setUserInviteForm({ email: "", roleSlug: "viewer" });
      setKeyForm({ name: "" });
      return;
    }

    void loadTenants(session);
  }, [session]);

  useEffect(() => {
    if (tenants.length === 0) {
      setSelectedTenantId(null);
      setTenantEdit(defaultTenantEditState(undefined));
      return;
    }

    setSelectedTenantId((current) => {
      if (current && tenants.some((tenant) => tenant.id === current)) {
        return current;
      }

      return tenants[0]?.id ?? null;
    });
  }, [tenants, plans]);

  useEffect(() => {
    const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId) ?? null;
      setTenantEdit(defaultTenantEditState(selectedTenant));
  }, [selectedTenantId, tenants, plans]);

  useEffect(() => {
    if (plans.length === 0) {
      return;
    }

    setTenantForm((current) => {
      const hasSelectedPlan = plans.some((plan) => plan.id === current.planId);
      return hasSelectedPlan ? current : { ...current, planId: getDefaultPlanId(plans) };
    });
  }, [plans]);

  useEffect(() => {
    setTenantPage(0);
  }, [tenantFilters.search, tenantFilters.status, tenantFilters.planId]);

  useEffect(() => {
    const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId) ?? null;

    if (!session || !selectedTenant) {
      if (tenantWorkspace !== "list" && tenantWorkspace !== "create") {
        setTenantWorkspace("list");
      }
      setTenantDomains([]);
      setDomainForm("");
      setWidgetConfig(defaultTenantWidgetConfigState());
      setTenantAgentConfig(defaultTenantAgentConfigState());
      setTenantAccessById({});
      setTenantSessionsById({});
      setTenantInsightsById({});
      setUserInviteForm({ email: "", roleSlug: "viewer" });
      setKeyForm({ name: "" });
      return;
    }

    void loadTenantDetails(selectedTenant.id);
  }, [selectedTenantId, tenants, session, tenantWorkspace]);

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
        [selectedTenant.id]: emptyTenantAccessState(),
      };
    });
  }, [selectedTenantId, tenants, session]);

  useEffect(() => {
    const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId) ?? null;
    if (!session || !selectedTenant) {
      return;
    }

    setTenantConversationsById((current) => {
      if (current[selectedTenant.id]) {
        return current;
      }

      return {
        ...current,
        [selectedTenant.id]: emptyTenantConversationState(),
      };
    });
  }, [selectedTenantId, tenants, session]);

  useEffect(() => {
    const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId) ?? null;
    if (!session || !selectedTenant) {
      return;
    }

    setTenantInsightsById((current) => {
      if (current[selectedTenant.id]) {
        return current;
      }

      return {
        ...current,
        [selectedTenant.id]: emptyTenantAnalyticsState(),
      };
    });
  }, [selectedTenantId, tenants, session]);

  useEffect(() => {
    const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId) ?? null;
    if (!session || !selectedTenant) {
      return;
    }

    const currentState = tenantConversationsById[selectedTenant.id];
    if (!currentState) {
      return;
    }

    const selectedConversationId =
      currentState.selectedConversationId ?? currentState.conversations[0]?.id ?? null;
    if (
      !selectedConversationId ||
      currentState.selectedConversation?.id === selectedConversationId
    ) {
      return;
    }

    void loadTenantConversationDetails(selectedTenant.id, selectedConversationId);
  }, [selectedTenantId, tenants, session, tenantConversationsById]);

  const updateNotice = (notice: string | null) => {
    setViewState((current) => ({
      ...current,
      notice,
      error: null,
    }));
  };

  const updateError = (error: string | null) => {
    setViewState((current) => ({
      ...current,
      error,
      notice: null,
    }));
  };

  const isAuthError = (error: unknown): error is ApiError =>
    error instanceof ApiError && error.status === 401;

  const handleAuthFailure = () => {
    setSession(null);
    updateError(AUTH_EXPIRED_MESSAGE);

    try {
      window.sessionStorage.setItem(AUTH_EXPIRED_FLASH_KEY, AUTH_EXPIRED_MESSAGE);
      // Reload garante boot limpo mesmo com bundle/state obsoleto na aba.
      // Apos recarregar nao ha sessao, logo nenhuma chamada dispara novo 401.
      window.location.reload();
    } catch {
      // Sem navegacao real (ex.: testes): a troca de view por estado cobre o caso.
    }
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

      try {
        const refreshed = await refreshAdmin(session.refreshToken);
        setSession(refreshed);
        return action(refreshed.accessToken);
      } catch {
        throw new ApiError("Sessao expirada. Entre novamente.", 401);
      }
    }
  };

  const loadTenants = async (currentSession = session) => {
    if (!currentSession) {
      return;
    }

    setViewState((current) => ({ ...current, loading: true, error: null }));

    try {
      const shouldRefreshPlans = plans.length === 0;
      const [items, nextPlans] = await withSessionRetry(async (accessToken) =>
        Promise.all([
          listTenants(accessToken),
          shouldRefreshPlans ? listPlans(accessToken) : Promise.resolve(plans),
        ]),
      );
      setTenants(items);
      if (shouldRefreshPlans) {
        setPlans(nextPlans);
      }
      setViewState((current) => ({
        ...current,
        loading: false,
        notice: `${items.length} tenant(s) carregado(s).`,
      }));
    } catch (error) {
      setViewState((current) => ({ ...current, loading: false }));

      if (isAuthError(error)) {
        handleAuthFailure();
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
      const [
        domains,
        config,
        agentConfig,
        users,
        roles,
        apiKeys,
        sessions,
        conversations,
        analytics,
        auditLogs,
        systemLogs,
      ] = await withSessionRetry(async (accessToken) => {
        const [nextDomains, nextConfig, nextAgentConfig] = await Promise.all([
          listTenantDomains(accessToken, tenantId),
          getTenantConfig(accessToken, tenantId),
          getTenantAgentConfig(accessToken, tenantId),
        ]);

        const [nextUsers, nextRoles, nextApiKeys] = await Promise.all([
          listTenantUsers(accessToken, tenantId),
          listTenantRoles(accessToken, tenantId),
          listTenantApiKeys(accessToken, tenantId),
        ]);

        const nextSessions = await listTenantSessions(accessToken, tenantId);
        const nextConversations = await listTenantConversations(accessToken, tenantId);
        const [nextAnalytics, nextAuditLogs, nextSystemLogs] = await Promise.all([
          listTenantAnalytics(accessToken, tenantId),
          listTenantAuditLogs(accessToken, tenantId),
          listTenantSystemLogs(accessToken, tenantId),
        ]);

        return [
          nextDomains,
          nextConfig,
          nextAgentConfig,
          nextUsers,
          nextRoles,
          nextApiKeys,
          nextSessions,
          nextConversations,
          nextAnalytics,
          nextAuditLogs,
          nextSystemLogs,
        ] as const;
      });

      setTenantDomains(domains);
      setDomainForm("");
      setWidgetConfig(defaultTenantWidgetConfigState(config));
      setTenantAgentConfig(defaultTenantAgentConfigState(agentConfig));
      setTenantAccessById((current) => ({
        ...current,
        [tenantId]: {
          users: Array.isArray(users) ? users.map(normalizeTenantUser) : [],
          roles: Array.isArray(roles) ? roles : [],
          apiKeys: Array.isArray(apiKeys) ? apiKeys : [],
          pendingSecret: null,
        },
      }));
      setTenantSessionsById((current) => ({
        ...current,
        [tenantId]: Array.isArray(sessions) ? sessions : [],
      }));
      setTenantInsightsById((current) => ({
        ...current,
        [tenantId]: {
          analytics: analytics ?? null,
          auditLogs: Array.isArray(auditLogs) ? auditLogs : [],
          systemLogs: Array.isArray(systemLogs) ? systemLogs : [],
        },
      }));
      setTenantConversationsById((current) => {
        const previous = current[tenantId] ?? emptyTenantConversationState();
        const nextConversations = Array.isArray(conversations) ? conversations : [];
        const selectedConversationId = nextConversations.some(
          (conversation) => conversation.id === previous.selectedConversationId,
        )
          ? previous.selectedConversationId
          : (nextConversations[0]?.id ?? null);

        return {
          ...current,
          [tenantId]: {
            conversations: nextConversations,
            selectedConversationId,
            selectedConversation: previous.selectedConversation ?? null,
          },
        };
      });
      setViewState((current) => ({
        ...current,
        loading: false,
      }));
    } catch (error) {
      setViewState((current) => ({ ...current, loading: false }));

      if (isAuthError(error)) {
        handleAuthFailure();
        return;
      }

      updateError(error instanceof Error ? error.message : "Falha ao carregar detalhes do tenant");
    }
  };

  const loadTenantConversationDetails = async (tenantId: string, conversationId: string) => {
    if (!session) {
      return;
    }

    setViewState((current) => ({ ...current, loading: true, error: null }));

    try {
      const conversation = await withSessionRetry((accessToken) =>
        getTenantConversation(accessToken, tenantId, conversationId),
      );

      setTenantConversationsById((current) => ({
        ...current,
        [tenantId]: {
          ...(current[tenantId] ?? emptyTenantConversationState()),
          selectedConversationId: conversation.id,
          selectedConversation: conversation,
        },
      }));
      setViewState((current) => ({ ...current, loading: false }));
    } catch (error) {
      setViewState((current) => ({ ...current, loading: false }));

      if (isAuthError(error)) {
        handleAuthFailure();
        return;
      }

      updateError(error instanceof Error ? error.message : "Falha ao carregar conversa");
    }
  };

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setViewState((current) => ({ ...current, loading: true, error: null, notice: null }));

    try {
      const result = await loginAdmin(loginState);
      setSession(result);
      setActiveSection("overview");
      setTenantWorkspace("list");
      setOperationsWorkspace("sessions");
      setAccessWorkspace("users");
      setLoginState(defaultLoginState);
      setViewState((current) => ({
        ...current,
        loading: false,
        notice: `Bem-vindo, ${result.user.email}.`,
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
        notice: "Sessao renovada com sucesso.",
      }));
    } catch {
      setViewState((current) => ({ ...current, loading: false }));
      handleAuthFailure();
    }
  };

  const handleCreatePlanSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await withSessionRetry((t) =>
        createPlan(t, { slug: planForm.slug.trim(), name: planForm.name.trim(), priceCents: Number(planForm.priceCents || 0) }),
      );
      setPlanForm({ slug: "", name: "", priceCents: "" });
      await loadTenants();
      updateNotice("Plano criado com sucesso.");
    } catch (error) {
      if (isAuthError(error)) {
        handleAuthFailure();
        return;
      }
      updateError(error instanceof Error ? error.message : "Falha ao criar plano");
    }
  };

  const handleUpdatePlanSubmit = async (planId: string) => {
    try {
      await withSessionRetry((t) =>
        updatePlanRequest(t, planId, {
          name: planEdit.name.trim(),
          priceCents: Number(planEdit.priceCents || 0),
          isActive: planEdit.isActive,
        }),
      );
      setEditingPlanId(null);
      await loadTenants();
      updateNotice("Plano atualizado com sucesso.");
    } catch (error) {
      if (isAuthError(error)) {
        handleAuthFailure();
        return;
      }
      updateError(error instanceof Error ? error.message : "Falha ao atualizar plano");
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!window.confirm("Apagar este plano?")) {
      return;
    }

    try {
      await withSessionRetry((t) => deletePlan(t, planId));
      await loadTenants();
      updateNotice("Plano apagado.");
    } catch (error) {
      if (isAuthError(error)) {
        handleAuthFailure();
        return;
      }
      updateError(error instanceof Error ? error.message : "Falha ao apagar plano");
    }
  };

  const handleUnlinkTenantPlan = async (tenantId: string) => {
    try {
      await withSessionRetry((t) => updateTenant(t, tenantId, { planId: null }));
      await loadTenants();
      updateNotice("Plano desvinculado do tenant.");
    } catch (error) {
      if (isAuthError(error)) {
        handleAuthFailure();
        return;
      }
      updateError(error instanceof Error ? error.message : "Falha ao desvincular plano");
    }
  };

  const handleLogout = () => {
    setSession(null);
    setTenants([]);
    setPlans([]);
    setActiveSection("overview");
    setTenantWorkspace("list");
    setOperationsWorkspace("sessions");
    setAccessWorkspace("users");
    setLoginState(defaultLoginState);
    setTenantForm(defaultTenantFormState());
    setTenantEdit(defaultTenantEditState(undefined));
    setTenantAgentConfig(defaultTenantAgentConfigState());
    setTenantAccessById({});
    setTenantConversationsById({});
    setTenantSessionsById({});
    setTenantInsightsById({});
    setActiveSection("overview");
    setViewState({
      loading: false,
      error: null,
      notice: "Sessao encerrada.",
    });
  };

  const handleCreateTenantSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session?.user.roles.includes("platform_admin")) {
      updateError("Somente platform_admin pode criar tenants.");
      return;
    }

    setViewState((current) => ({ ...current, loading: true, error: null, notice: null }));

    try {
      const createdTenant = await withSessionRetry((accessToken) =>
        createTenant(accessToken, {
          publicId: tenantForm.publicId,
          name: tenantForm.name,
          planId: tenantForm.planId,
          defaultLocale: tenantForm.defaultLocale,
        }),
      );

      setSelectedTenantId(createdTenant.id);
      setTenantForm(defaultTenantFormState(plans));
      setActiveSection("tenants");
      setTenantWorkspace("details");
      await loadTenants();
      updateNotice("Tenant criado com sucesso.");
    } catch (error) {
      setViewState((current) => ({ ...current, loading: false }));

      if (isAuthError(error)) {
        handleAuthFailure();
        return;
      }

      updateError(error instanceof Error ? error.message : "Falha ao criar tenant");
    }
  };

  const handleSelectTenant = (tenant: TenantRecord) => {
    setSelectedTenantId(tenant.id);
    setActiveSection("tenants");
    setTenantWorkspace("details");
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

      if (isAuthError(error)) {
        handleAuthFailure();
        return;
      }

      updateError(error instanceof Error ? error.message : "Falha ao cadastrar dominio");
    }
  };

  const handleDeleteDomain = async (domainId: string, domainName: string) => {
    const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId);
    if (!session || !selectedTenant) {
      return;
    }

    if (
      typeof window !== "undefined" &&
      !window.confirm(`Remover dominio ${domainName}? Esta acao nao pode ser desfeita.`)
    ) {
      return;
    }

    setViewState((current) => ({ ...current, loading: true, error: null, notice: null }));

    try {
      await withSessionRetry((accessToken) =>
        deleteTenantDomain(accessToken, selectedTenant.id, domainId),
      );
      await loadTenantDetails(selectedTenant.id);
      updateNotice("Dominio removido com sucesso.");
    } catch (error) {
      setViewState((current) => ({ ...current, loading: false }));

      if (isAuthError(error)) {
        handleAuthFailure();
        return;
      }

      updateError(error instanceof Error ? error.message : "Falha ao remover dominio");
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
        placeholder: widgetConfig.placeholder,
      };

      await withSessionRetry((accessToken) =>
        upsertTenantConfig(accessToken, selectedTenant.id, payload),
      );
      await loadTenantDetails(selectedTenant.id);
      updateNotice("Configuracao do widget salva com sucesso.");
    } catch (error) {
      setViewState((current) => ({ ...current, loading: false }));

      if (isAuthError(error)) {
        handleAuthFailure();
        return;
      }

      updateError(
        error instanceof Error ? error.message : "Falha ao salvar configuracao do widget",
      );
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
        isActive: tenantAgentConfig.isActive,
      };

      await withSessionRetry((accessToken) =>
        upsertTenantAgentConfig(accessToken, selectedTenant.id, payload),
      );
      await loadTenantDetails(selectedTenant.id);
      updateNotice("Configuracao de agente salva com sucesso.");
    } catch (error) {
      setViewState((current) => ({ ...current, loading: false }));

      if (isAuthError(error)) {
        handleAuthFailure();
        return;
      }

      updateError(
        error instanceof Error ? error.message : "Falha ao salvar configuracao de agente",
      );
    }
  };

  const handleInviteUserSubmit = async (event: FormEvent<HTMLFormElement>) => {
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

    setViewState((current) => ({ ...current, loading: true, error: null, notice: null }));

    try {
      await withSessionRetry((accessToken) =>
        inviteTenantUser(accessToken, selectedTenant.id, {
          email,
          roleSlug: userInviteForm.roleSlug,
        }),
      );
      await loadTenantDetails(selectedTenant.id);
      setUserInviteForm({ email: "", roleSlug: "viewer" });
      updateNotice("Convite de usuario enviado com sucesso.");
    } catch (error) {
      setViewState((current) => ({ ...current, loading: false }));

      if (isAuthError(error)) {
        handleAuthFailure();
        return;
      }

      updateError(error instanceof Error ? error.message : "Falha ao convidar usuario");
    }
  };

  const handleUpdateUserRoles = async (userId: string, roleSlug: string) => {
    const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId);
    if (!session || !selectedTenant) {
      return;
    }

    setViewState((current) => ({ ...current, loading: true, error: null, notice: null }));

    try {
      await withSessionRetry((accessToken) =>
        updateTenantUserRoles(accessToken, selectedTenant.id, userId, {
          roleSlugs: [roleSlug],
        }),
      );
      await loadTenantDetails(selectedTenant.id);
      updateNotice("Roles do usuario atualizados com sucesso.");
    } catch (error) {
      setViewState((current) => ({ ...current, loading: false }));

      if (isAuthError(error)) {
        handleAuthFailure();
        return;
      }

      updateError(error instanceof Error ? error.message : "Falha ao atualizar roles do usuario");
    }
  };

  const handleUpdateUserStatus = async (
    userId: string,
    status: "active" | "invited" | "suspended",
  ) => {
    const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId);
    if (!session || !selectedTenant) {
      return;
    }

    setViewState((current) => ({ ...current, loading: true, error: null, notice: null }));

    try {
      await withSessionRetry((accessToken) =>
        updateTenantUserStatus(accessToken, selectedTenant.id, userId, { status }),
      );
      await loadTenantDetails(selectedTenant.id);
      updateNotice("Status do usuario atualizado com sucesso.");
    } catch (error) {
      setViewState((current) => ({ ...current, loading: false }));

      if (isAuthError(error)) {
        handleAuthFailure();
        return;
      }

      updateError(error instanceof Error ? error.message : "Falha ao atualizar status do usuario");
    }
  };

  const handleCreateApiKeySubmit = async (event: FormEvent<HTMLFormElement>) => {
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

    setViewState((current) => ({ ...current, loading: true, error: null, notice: null }));

    try {
      const created = await withSessionRetry((accessToken) =>
        createTenantApiKey(accessToken, selectedTenant.id, { name }),
      );
      await loadTenantDetails(selectedTenant.id);
      setTenantAccessById((current) => ({
        ...current,
        [selectedTenant.id]: {
          ...(current[selectedTenant.id] ?? emptyTenantAccessState()),
          pendingSecret: created.secret,
        },
      }));
      setKeyForm({ name: "" });
      updateNotice("Chave criada. O segredo fica visivel apenas agora.");
    } catch (error) {
      setViewState((current) => ({ ...current, loading: false }));

      if (isAuthError(error)) {
        handleAuthFailure();
        return;
      }

      updateError(error instanceof Error ? error.message : "Falha ao criar chave");
    }
  };

  const handleRevokeApiKey = async (keyId: string) => {
    const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId);
    if (!session || !selectedTenant) {
      return;
    }

    setViewState((current) => ({ ...current, loading: true, error: null, notice: null }));

    try {
      await withSessionRetry((accessToken) =>
        revokeTenantApiKey(accessToken, selectedTenant.id, keyId),
      );
      await loadTenantDetails(selectedTenant.id);
      updateNotice("Chave revogada com sucesso.");
    } catch (error) {
      setViewState((current) => ({ ...current, loading: false }));

      if (isAuthError(error)) {
        handleAuthFailure();
        return;
      }

      updateError(error instanceof Error ? error.message : "Falha ao revogar chave");
    }
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
        status: tenantEdit.status,
      };

      if (tenantEdit.planId === "__none__") {
        payload.planId = null;
      } else if (tenantEdit.planId) {
        payload.planId = tenantEdit.planId;
      }

      await withSessionRetry((accessToken) =>
        updateTenant(accessToken, selectedTenant.id, payload),
      );
      await loadTenants();
      updateNotice("Tenant atualizado com sucesso.");
    } catch (error) {
      setViewState((current) => ({ ...current, loading: false }));

      if (isAuthError(error)) {
        handleAuthFailure();
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

    if (!session?.user?.roles.includes("platform_admin")) {
      updateError("Somente platform_admin pode excluir tenants.");
      return;
    }

    try {
      if (typeof window.confirm === "function") {
        try {
          if (!window.confirm(`Excluir ${selectedTenant.name}? Esta acao nao pode ser desfeita.`)) {
            return;
          }
        } catch {
          // Fallback for test environments that do not implement confirm.
        }
      }

      setViewState((current) => ({ ...current, loading: true, error: null, notice: null }));
      await withSessionRetry((accessToken) => deleteTenant(accessToken, selectedTenant.id));
      setSelectedTenantId(null);
      setTenantWorkspace("list");
      await loadTenants();
      updateNotice("Tenant excluido com sucesso.");
    } catch (error) {
      setViewState((current) => ({ ...current, loading: false }));

      if (isAuthError(error)) {
        handleAuthFailure();
        return;
      }

      updateError(error instanceof Error ? error.message : "Falha ao excluir tenant");
    }
  };

  const isPlatformAdmin = Boolean(session?.user?.roles?.includes("platform_admin"));
  const canSubmitTenant = Boolean(
    tenantForm.publicId.trim() && tenantForm.name.trim() && session && isPlatformAdmin,
  );
  const selectedTenant =
    tenants.find((tenant) => tenant.id === selectedTenantId) ?? tenants[0] ?? null;
  const selectedTenantPlan = selectedTenant
    ? (plans.find((plan) => plan.id === selectedTenant.planId) ?? null)
    : null;
  const totalActiveTenants = tenants.filter((tenant) => tenant.status === "active").length;
  const totalSuspendedTenants = tenants.filter((tenant) => tenant.status === "suspended").length;
  const activePlanCount = plans.filter((plan) => plan.isActive).length;
  const platformOrigin =
    typeof window !== "undefined" ? window.location.origin : "https://faqchatbot.rigbie.com.br";
  const platformHostname =
    typeof window !== "undefined" ? window.location.hostname : "faqchatbot.rigbie.com.br";
  const platformEnvironment = import.meta.env.MODE;
  const widgetScriptUrl = `${platformOrigin}/widget.js`;
  const selectedTenantSnippet = selectedTenant?.publicId
    ? buildWidgetSnippet(selectedTenant.id)
    : null;
  const canSubmitDomain = Boolean(session && selectedTenant && domainForm.trim());
  const safeTenantDomains = Array.isArray(tenantDomains) ? tenantDomains : [];
  const domainLabel =
    safeTenantDomains.length === 0
      ? "Nenhum dominio cadastrado"
      : `${safeTenantDomains.length} dominio(s)`;
  const filteredTenants = tenants.filter((tenant) => {
    const search = tenantFilters.search.trim().toLowerCase();
    const matchesSearch =
      search.length === 0 ||
      tenant.publicId.toLowerCase().includes(search) ||
      tenant.name.toLowerCase().includes(search);
    const matchesStatus = tenantFilters.status === "" || tenant.status === tenantFilters.status;
    const matchesPlan = tenantFilters.planId === "" || tenant.planId === tenantFilters.planId;

    return matchesSearch && matchesStatus && matchesPlan;
  });
  const tenantPageSize = 5;
  const tenantPageCount = Math.max(1, Math.ceil(filteredTenants.length / tenantPageSize));
  const tenantPageIndex = Math.min(tenantPage, tenantPageCount - 1);
  const paginatedTenants = filteredTenants.slice(
    tenantPageIndex * tenantPageSize,
    tenantPageIndex * tenantPageSize + tenantPageSize,
  );
  const tenantPageStart = filteredTenants.length === 0 ? 0 : tenantPageIndex * tenantPageSize + 1;
  const tenantPageEnd =
    filteredTenants.length === 0
      ? 0
      : Math.min(filteredTenants.length, tenantPageIndex * tenantPageSize + tenantPageSize);
  const hasTenantFilters =
    tenantFilters.search.trim().length > 0 ||
    tenantFilters.status !== "" ||
    tenantFilters.planId !== "";
  const selectedTenantAccess = selectedTenant
    ? (tenantAccessById[selectedTenant.id] ?? emptyTenantAccessState())
    : null;
  const selectedTenantAccessUsers =
    selectedTenantAccess && Array.isArray(selectedTenantAccess.users)
      ? selectedTenantAccess.users
      : [];
  const selectedTenantAccessRoles =
    selectedTenantAccess && Array.isArray(selectedTenantAccess.roles)
      ? selectedTenantAccess.roles
      : [];
  const selectedTenantAccessApiKeys =
    selectedTenantAccess && Array.isArray(selectedTenantAccess.apiKeys)
      ? selectedTenantAccess.apiKeys
      : [];
  const selectedTenantSessions = selectedTenant
    ? (tenantSessionsById[selectedTenant.id] ?? [])
    : [];
  const selectedTenantConversations = selectedTenant
    ? (tenantConversationsById[selectedTenant.id] ?? emptyTenantConversationState())
    : null;
  const selectedTenantConversationList = selectedTenantConversations?.conversations ?? [];
  const selectedConversationDetail = selectedTenantConversations?.selectedConversation ?? null;
  const selectedConversationId = selectedTenantConversations?.selectedConversationId ?? null;
  const selectedConversationMessages =
    selectedConversationDetail && Array.isArray(selectedConversationDetail.messages)
      ? selectedConversationDetail.messages
      : [];
  const selectedTenantDomainCount = safeTenantDomains.length;
  const selectedTenantUserCount = selectedTenantAccessUsers.length;
  const selectedTenantRoleCount = selectedTenantAccessRoles.length;
  const selectedTenantApiKeyCount = selectedTenantAccessApiKeys.length;
  const selectedTenantSessionCount = selectedTenantSessions.length;
  const selectedTenantInsights = selectedTenant
    ? (tenantInsightsById[selectedTenant.id] ?? emptyTenantAnalyticsState())
    : emptyTenantAnalyticsState();
  const selectedTenantAnalytics = selectedTenantInsights.analytics;
  const selectedTenantAuditLogs = Array.isArray(selectedTenantInsights.auditLogs)
    ? selectedTenantInsights.auditLogs
    : [];
  const selectedTenantSystemLogs = Array.isArray(selectedTenantInsights.systemLogs)
    ? selectedTenantInsights.systemLogs
    : [];

  const handleSelectConversation = (conversationId: string) => {
    if (!selectedTenant) {
      return;
    }

    setTenantConversationsById((current) => {
      const currentState = current[selectedTenant.id] ?? emptyTenantConversationState();
      return {
        ...current,
        [selectedTenant.id]: {
          ...currentState,
          selectedConversationId: conversationId,
          selectedConversation:
            currentState.selectedConversation?.id === conversationId
              ? currentState.selectedConversation
              : null,
        },
      };
    });
  };

  const handleCopyWidgetSnippet = async () => {
    if (!selectedTenantSnippet) {
      return;
    }

    try {
      await copyTextToClipboard(selectedTenantSnippet);
      updateNotice("Snippet copiado para a area de transferencia.");
    } catch (error) {
      updateError(error instanceof Error ? error.message : "Falha ao copiar snippet");
    }
  };

  const handleCopyApiKeySecret = async () => {
    const secret = selectedTenantAccess?.pendingSecret;
    if (!secret) {
      return;
    }

    try {
      await copyTextToClipboard(secret);
      updateNotice("Segredo da chave copiado para a area de transferencia.");
    } catch (error) {
      updateError(error instanceof Error ? error.message : "Falha ao copiar segredo");
    }
  };

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

        <nav aria-label="Seções do dashboard" className="sidebar-nav">
          {dashboardSections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={activeSection === section.id ? "nav-link is-active" : "nav-link"}
              onClick={() => setActiveSection(section.id)}
              aria-pressed={activeSection === section.id}
              title={section.description}
            >
              <span>{section.label}</span>
              <small>{section.description}</small>
            </button>
          ))}
        </nav>

        <section className="sidebar-panel">
          <span>Status</span>
          <strong>{session ? "Autenticado" : "Desconectado"}</strong>
          <p>{session?.user?.email ?? "Entre para carregar os dados administrativos."}</p>
          {session ? <small>{isPlatformAdmin ? "Acesso global" : "Acesso restrito"}</small> : null}
        </section>
      </aside>

      <section
        className="content"
        data-active-section={activeSection}
        data-tenant-workspace={tenantWorkspace}
        data-operations-workspace={operationsWorkspace}
        data-access-workspace={accessWorkspace}
      >
        <header className="page-header">
          <div>
            <p>Plataforma</p>
            <h1>Embeddable AI Platform</h1>
            <span>Operacao multi-tenant, dashboard administrativo e widget embutivel.</span>
          </div>

          <div className="header-actions">
            {session ? (
              <>
                <button
                  type="button"
                  className="secondary"
                  onClick={handleRefresh}
                  disabled={viewState.loading}
                >
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
        {session && !isPlatformAdmin ? (
          <div className="banner warning">
            Este usuário está em modo restrito. Ações globais, como criar ou excluir tenants, foram
            bloqueadas.
          </div>
        ) : null}

        {session && activeSection === "tenants" ? (
          <div className="workspace-tabs tenant-rail" aria-label="Navegação de tenants">
            {tenantWorkspaces.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                className={tenantWorkspace === workspace.id ? "tab-link is-active" : "tab-link"}
                onClick={() => setTenantWorkspace(workspace.id)}
                title={workspace.description}
                disabled={
                  !selectedTenant &&
                  (workspace.id === "details" ||
                    workspace.id === "widget" ||
                    workspace.id === "security" ||
                    workspace.id === "agent")
                }
              >
                <span>{workspace.label}</span>
                <small>{workspace.description}</small>
              </button>
            ))}
          </div>
        ) : null}

        {session && activeSection === "operations" ? (
          <div className="workspace-tabs" aria-label="Navegação de operações">
            {operationsWorkspaces.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                className={operationsWorkspace === workspace.id ? "tab-link is-active" : "tab-link"}
                onClick={() => setOperationsWorkspace(workspace.id)}
                title={workspace.description}
              >
                {workspace.label}
              </button>
            ))}
          </div>
        ) : null}

        {session && activeSection === "access" ? (
          <div className="workspace-tabs" aria-label="Navegação de acesso">
            {accessWorkspaces.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                className={accessWorkspace === workspace.id ? "tab-link is-active" : "tab-link"}
                onClick={() => setAccessWorkspace(workspace.id)}
                title={workspace.description}
              >
                {workspace.label}
              </button>
            ))}
          </div>
        ) : null}

        {!session ? (
          <section className="auth-grid" id="overview">
            <article className="hero-card">
              <p className="eyebrow">Controle operacional</p>
              <h2>Entre no painel para administrar tenants, widgets e configuracoes.</h2>
              <p>
                O dashboard consome a API atual da plataforma e permite iniciar a operacao sem tocar
                diretamente no banco.
              </p>
              <div className="health-panel">
                <strong>Status da plataforma</strong>
                <p>
                  {platformHealthStatus === "loading"
                    ? "Carregando status da API..."
                    : platformHealthStatus === "ok" && platformHealth
                      ? `API ${platformHealth.service} operacional em ${new Date(platformHealth.timestamp).toLocaleString("pt-BR")}.`
                      : "API indisponivel no momento."}
                </p>
                <small>
                  {platformHealth?.checks?.database === "ok"
                    ? "Banco de dados respondendo normalmente."
                    : platformHealthStatus === "ok"
                      ? "Banco de dados sem detalhe."
                      : "Sem verificacao de banco disponivel."}
                </small>
              </div>
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
            <section className="metric-grid panel-section panel-overview" id="overview">
              <article className="surface metric-card">
                <span>Status da plataforma</span>
                <strong>
                  {platformHealthStatus === "loading"
                    ? "..."
                    : platformHealthStatus === "ok"
                      ? "Operacional"
                      : "Indisponivel"}
                </strong>
              </article>
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
              <article className="surface metric-card">
                <span>Planos ativos</span>
                <strong>{activePlanCount}</strong>
              </article>
              <article className="surface metric-card">
                <span>Dominios do tenant</span>
                <strong>{selectedTenantDomainCount}</strong>
              </article>
              <article className="surface metric-card">
                <span>Usuarios do tenant</span>
                <strong>{selectedTenantUserCount}</strong>
              </article>
              <article className="surface metric-card">
                <span>API keys do tenant</span>
                <strong>{selectedTenantApiKeyCount}</strong>
              </article>
              <article className="surface metric-card">
                <span>Sessoes do tenant</span>
                <strong>{selectedTenantSessionCount}</strong>
              </article>
            </section>

            <section
              className="surface settings-section panel-section panel-settings"
              id="settings"
            >
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Plataforma</p>
                  <h2>Configuracoes gerais</h2>
                  <p className="section-subtitle">
                    Dominio publico, ambiente de execucao e parametros operacionais atuais.
                  </p>
                </div>
                <strong>{platformEnvironment}</strong>
              </div>

              <div className="settings-grid">
                <article className="surface settings-card">
                  <span>Dominio da plataforma</span>
                  <strong>{platformHostname}</strong>
                  <p>Origem atual: {platformOrigin}</p>
                </article>

                <article className="surface settings-card">
                  <span>Ambiente</span>
                  <strong>{platformEnvironment}</strong>
                  <p>Build e rotas do dashboard seguem o ambiente configurado no Vite.</p>
                </article>

                <article className="surface settings-card">
                  <span>Widget publico</span>
                  <strong className="mono">{widgetScriptUrl}</strong>
                  <p>Endpoint principal para publicar o script embutivel.</p>
                </article>

                <article className="surface settings-card">
                  <span>Parametros operacionais</span>
                  <strong>{tenantPageSize} tenants por pagina</strong>
                  <p>Paginação do painel, sessão local e health checks do backend.</p>
                </article>
              </div>

              <div className="two-column compact">
                <article className="surface settings-card">
                  <span>Estado da API</span>
                  <strong>
                    {platformHealthStatus === "loading"
                      ? "Carregando"
                      : platformHealthStatus === "ok"
                        ? "Operacional"
                        : "Indisponivel"}
                  </strong>
                  <p>
                    {platformHealth?.checks?.database === "ok"
                      ? `Banco online desde ${new Date(platformHealth.timestamp).toLocaleString("pt-BR")}.`
                      : "Sem resposta detalhada do health check."}
                  </p>
                </article>

                <article className="surface settings-card">
                  <span>Persistencia do login</span>
                  <strong className="mono">{STORAGE_KEY}</strong>
                  <p>Token da sessao administrativa salvo localmente no navegador.</p>
                </article>
              </div>
            </section>

            <section className="surface plan-section panel-section panel-plans" id="plans">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Catálogo</p>
                  <h2>Planos disponíveis</h2>
                  <p className="section-subtitle">
                    {plans.length === 0
                      ? "Nenhum plano foi carregado."
                      : `${plans.length} plano(s) sincronizado(s) com a API.`}
                  </p>
                </div>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => void loadTenants()}
                  disabled={viewState.loading}
                >
                  Recarregar
                </button>
              </div>

              <form
                className="stack"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleCreatePlanSubmit(event);
                }}
              >
                <h3>Criar plano</h3>
                <label>
                  <span>Slug</span>
                  <input required value={planForm.slug} onChange={(e) => setPlanForm({ ...planForm, slug: e.target.value })} />
                </label>
                <label>
                  <span>Nome</span>
                  <input required value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} />
                </label>
                <label>
                  <span>Preco (centavos)</span>
                  <input value={planForm.priceCents} onChange={(e) => setPlanForm({ ...planForm, priceCents: e.target.value })} />
                </label>
                <button type="submit" className="primary">Criar plano</button>
              </form>

              <div className="plan-grid">
                {plans.length === 0 ? (
                  <div className="empty-state">
                    <strong>Nenhum plano carregado.</strong>
                    <p>
                      Verifique a API administrativa ou recarregue a sessão para buscar o catálogo.
                    </p>
                  </div>
                ) : (
                  plans.map((plan) => {
                    const limits = formatPlanLimits(plan.limits);

                    return (
                      <article className="surface plan-card" key={plan.id}>
                        <div className="plan-card-header">
                          <div>
                            <p className="eyebrow">{plan.slug}</p>
                            <h3>{plan.name}</h3>
                          </div>
                          <span className={plan.isActive ? "status-pill success" : "status-pill"}>
                            {plan.isActive ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                        <strong>{formatPlanPrice(plan.priceCents)}</strong>
                        <dl className="plan-limits">
                          <div>
                            <dt>Mensagens/min</dt>
                            <dd>{limits.messagesPerMinute ?? "Sem limite"}</dd>
                          </div>
                          <div>
                            <dt>Conversas/dia</dt>
                            <dd>{limits.conversationsPerDay ?? "Sem limite"}</dd>
                          </div>
                        </dl>
                        <small>ID {plan.id}</small>
                        <div className="plan-actions">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPlanId(editingPlanId === plan.id ? null : plan.id);
                              setPlanEdit({ name: plan.name, priceCents: String(plan.priceCents), isActive: plan.isActive });
                            }}
                          >
                            Editar
                          </button>
                          <button type="button" onClick={() => void handleDeletePlan(plan.id)}>Apagar</button>
                        </div>
                        {editingPlanId === plan.id && (
                          <form
                            className="stack"
                            onSubmit={(event) => {
                              event.preventDefault();
                              void handleUpdatePlanSubmit(plan.id);
                            }}
                          >
                            <label>
                              <span>Nome</span>
                              <input value={planEdit.name} onChange={(e) => setPlanEdit({ ...planEdit, name: e.target.value })} />
                            </label>
                            <label>
                              <span>Preco (centavos)</span>
                              <input value={planEdit.priceCents} onChange={(e) => setPlanEdit({ ...planEdit, priceCents: e.target.value })} />
                            </label>
                            <label>
                              <span>Ativo</span>
                              <input type="checkbox" checked={planEdit.isActive} onChange={(e) => setPlanEdit({ ...planEdit, isActive: e.target.checked })} />
                            </label>
                            <button type="submit" className="primary">Salvar plano</button>
                          </form>
                        )}
                        {tenants.some((t) => t.planId === plan.id) && (
                          <div className="plan-tenants">
                            <small>Tenants vinculados</small>
                            <ul>
                              {tenants.filter((t) => t.planId === plan.id).map((t) => (
                                <li key={`unlink-${t.id}`}>
                                  {t.publicId}
                                  {" "}
                                  <button type="button" onClick={() => void handleUnlinkTenantPlan(t.id)}>
                                    Desvincular
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            </section>

            <section className="two-column panel-section panel-tenants">
              <article
                className="surface panel-section panel-tenants"
                id="tenants"
                data-tenant-panel="list"
              >
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Clientes</p>
                    <h2>Lista de tenants</h2>
                    <p className="section-subtitle">
                      {filteredTenants.length === tenants.length
                        ? `${tenants.length} tenant(s) no total.`
                        : `${filteredTenants.length} de ${tenants.length} tenant(s) visiveis.`}
                      {filteredTenants.length > 0
                        ? ` Mostrando ${tenantPageStart}-${tenantPageEnd} de ${filteredTenants.length}.`
                        : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => void loadTenants()}
                    disabled={viewState.loading}
                  >
                    Recarregar
                  </button>
                </div>

                <div className="filter-panel">
                  <label>
                    <span>Buscar</span>
                    <input
                      value={tenantFilters.search}
                      onChange={(event) =>
                        setTenantFilters((current) => ({ ...current, search: event.target.value }))
                      }
                      placeholder="Public ID ou nome"
                    />
                  </label>
                  <label>
                    <span>Status</span>
                    <select
                      value={tenantFilters.status}
                      onChange={(event) =>
                        setTenantFilters((current) => ({
                          ...current,
                          status: event.target.value as TenantStatusFilter,
                        }))
                      }
                    >
                      <option value="">Todos</option>
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                      <option value="suspended">Suspenso</option>
                    </select>
                  </label>
                  <label>
                    <span>Plano</span>
                    <select
                      value={tenantFilters.planId}
                      onChange={(event) =>
                        setTenantFilters((current) => ({
                          ...current,
                          planId: event.target.value as TenantPlanFilter,
                        }))
                      }
                    >
                      <option value="">Todos</option>
                      {plans.map((plan) => (
                        <option key={`filter-plan-${plan.id}`} value={plan.id}>
                          {plan.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="filter-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setTenantFilters(defaultTenantListFiltersState())}
                      disabled={!hasTenantFilters}
                    >
                      Limpar filtros
                    </button>
                  </div>
                </div>

                <div className="table">
                  <div className="table-row table-head">
                    <span>Public ID</span>
                    <span>Nome</span>
                    <span>Plano</span>
                    <span>Status</span>
                  </div>

                  {filteredTenants.length === 0 ? (
                    <div className="empty-state">
                      <strong>
                        {tenants.length === 0
                          ? "Nenhum tenant encontrado."
                          : "Nenhum tenant corresponde aos filtros."}
                      </strong>
                      <p>
                        {tenants.length === 0
                          ? "Crie o primeiro cliente para liberar o widget e os fluxos administrativos."
                          : "Ajuste a busca, o status ou o plano para localizar o cliente desejado."}
                      </p>
                    </div>
                  ) : (
                    paginatedTenants.map((tenant) => (
                      <div className="table-row" key={tenant.id}>
                        <span className="mono">{tenant.publicId}</span>
                        <span>{tenant.name}</span>
                        <span>{getPlanLabel(plans, tenant.planId)}</span>
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

                {filteredTenants.length > tenantPageSize ? (
                  <div className="pagination-bar" aria-label="Paginação de tenants">
                    <span>
                      Página {tenantPageIndex + 1} de {tenantPageCount}
                    </span>
                    <div className="pagination-actions">
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setTenantPage((current) => Math.max(0, current - 1))}
                        disabled={tenantPageIndex === 0}
                      >
                        Anterior
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() =>
                          setTenantPage((current) => Math.min(tenantPageCount - 1, current + 1))
                        }
                        disabled={tenantPageIndex >= tenantPageCount - 1}
                      >
                        Próximo
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>

              <article
                className="surface panel-section panel-tenants"
                id="config"
                data-tenant-panel="create"
              >
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Operacao inicial</p>
                    <h2>Criar tenant</h2>
                    {!isPlatformAdmin ? (
                      <p className="section-subtitle">
                        Somente usuários com papel <span className="mono">platform_admin</span>{" "}
                        podem criar tenants.
                      </p>
                    ) : null}
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
                      value={tenantForm.planId}
                      onChange={(event) =>
                        setTenantForm((current) => ({
                          ...current,
                          planId: event.target.value as CreateTenantPayload["planId"],
                        }))
                      }
                    >
                      {plans.map((plan) => (
                        <option key={`create-plan-${plan.slug}`} value={plan.id}>
                          {plan.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Locale padrao</span>
                    <input
                      value={tenantForm.defaultLocale}
                      onChange={(event) =>
                        setTenantForm((current) => ({
                          ...current,
                          defaultLocale: event.target.value,
                        }))
                      }
                      placeholder="pt-BR"
                      required
                    />
                  </label>

                  <button
                    type="submit"
                    className="primary"
                    disabled={viewState.loading || !canSubmitTenant}
                  >
                    {viewState.loading ? "Salvando..." : "Criar tenant"}
                  </button>
                </form>
              </article>
            </section>

            {selectedTenant ? (
              <section
                className="surface tenant-detail panel-section panel-tenants"
                id="tenant-detail"
                data-tenant-panel="details"
              >
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Tenant selecionado</p>
                    <h2>{selectedTenant.name}</h2>
                  </div>
                  <div className="header-actions">
                    <button
                      type="button"
                      className="secondary danger"
                      onClick={handleSuspendTenant}
                      disabled={!isPlatformAdmin}
                    >
                      Excluir tenant
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
                    <dd>
                      {selectedTenantPlan
                        ? `${selectedTenantPlan.name} (${selectedTenantPlan.slug})`
                        : selectedTenant.planId}
                    </dd>
                  </div>
                  <div>
                    <dt>Dominios</dt>
                    <dd>{selectedTenantDomainCount}</dd>
                  </div>
                  <div>
                    <dt>Usuarios</dt>
                    <dd>{selectedTenantUserCount}</dd>
                  </div>
                  <div>
                    <dt>Roles</dt>
                    <dd>{selectedTenantRoleCount}</dd>
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
                        value={tenantEdit.planId}
                        onChange={(event) =>
                          setTenantEdit((current) => ({
                            ...current,
                            planId: event.target.value as TenantEditState["planId"],
                          }))
                        }
                      >
                        <option value="">Manter plano atual</option>
                        <option value="__none__">Sem plano</option>
                        {plans.map((plan) => (
                          <option key={`edit-plan-${plan.slug}`} value={plan.id}>
                            {plan.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span>Status</span>
                      <select
                        value={tenantEdit.status}
                        onChange={(event) =>
                          setTenantEdit((current) => ({
                            ...current,
                            status: event.target.value as TenantRecord["status"],
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
                        setTenantEdit((current) => ({
                          ...current,
                          defaultLocale: event.target.value,
                        }))
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

            <section
              className="surface widget-card panel-section panel-tenants"
              id="widget"
              data-tenant-panel="widget"
            >
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Widget</p>
                  <h2>Snippet de instalacao</h2>
                </div>
                {selectedTenantSnippet ? (
                  <div className="header-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => void handleCopyWidgetSnippet()}
                    >
                      Copiar snippet
                    </button>
                  </div>
                ) : null}
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
              <section className="two-column panel-section panel-tenants">
                <article
                  className="surface domain-card panel-section panel-tenants"
                  id="domains"
                  data-tenant-panel="security"
                >
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

                    <button
                      type="submit"
                      className="primary"
                      disabled={viewState.loading || !canSubmitDomain}
                    >
                      {viewState.loading ? "Salvando..." : "Adicionar dominio"}
                    </button>
                  </form>

                  <div className="list-card">
                    {safeTenantDomains.length === 0 ? (
                      <p>Nenhum dominio autorizado ainda.</p>
                    ) : (
                      safeTenantDomains.map((domain) => (
                        <div className="list-row" key={domain.id}>
                          <div>
                            <strong className="mono">{domain.domain}</strong>
                            <p>{domain.isVerified ? "Verificado" : "Pendente"}</p>
                          </div>
                          <button
                            type="button"
                            className="secondary danger"
                            onClick={() => void handleDeleteDomain(domain.id, domain.domain)}
                            disabled={viewState.loading}
                          >
                            Remover
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </article>

                <article
                  className="surface widget-config-card panel-section panel-tenants"
                  id="widget-config"
                  data-tenant-panel="widget"
                >
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
                            theme: event.target.value as TenantWidgetConfigState["theme"],
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
                            primaryColor: event.target.value,
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
                            iconUrl: event.target.value,
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
                            initialMessage: event.target.value,
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
                            placeholder: event.target.value,
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
              <section
                className="surface agent-config-card panel-section panel-tenants"
                id="agent-config"
                data-tenant-panel="agent"
              >
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
                            provider: event.target.value as TenantAgentConfigState["provider"],
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
                          setTenantAgentConfig((current) => ({
                            ...current,
                            model: event.target.value,
                          }))
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
                            webhookEndpointId: event.target.value,
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
                            encryptedCredentialsRef: event.target.value,
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
                          setTenantAgentConfig((current) => ({
                            ...current,
                            timeoutMs: event.target.value,
                          }))
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
                            isActive: event.target.checked,
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
                          routingRules: event.target.value,
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
                          retryPolicy: event.target.value,
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

            {selectedTenant ? (
              <section
                className="surface panel-section panel-operations"
                id="sessions"
                data-operations-panel="sessions"
              >
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Visibilidade</p>
                    <h2>Sessões do widget</h2>
                    <p className="section-subtitle">
                      {selectedTenantSessions.length === 0
                        ? "Nenhuma sessão encontrada para este tenant."
                        : `${selectedTenantSessions.length} sessão(ões) carregada(s).`}
                    </p>
                  </div>
                </div>

                <div className="list-card">
                  {selectedTenantSessions.length === 0 ? (
                    <p>Sem sessões registradas.</p>
                  ) : (
                    selectedTenantSessions.map((sessionRecord) => (
                      <button
                        key={sessionRecord.id}
                        type="button"
                        className="list-row"
                        onClick={() => {
                          if (sessionRecord.conversationId) {
                            handleSelectConversation(sessionRecord.conversationId);
                          }
                        }}
                        disabled={!sessionRecord.conversationId}
                      >
                        <div>
                          <strong>{sessionRecord.visitorId}</strong>
                          <p className="mono">
                            {sessionRecord.currentPage ??
                              sessionRecord.pageUrl ??
                              "Pagina nao informada"}
                          </p>
                          <small>
                            {sessionRecord.conversationId
                              ? `Conversa ${sessionRecord.conversationId}`
                              : "Sem conversa associada"}
                          </small>
                        </div>
                        <div>
                          <small>
                            {sessionRecord.lastSeenAt
                              ? new Date(sessionRecord.lastSeenAt).toLocaleString("pt-BR")
                              : sessionRecord.startedAt
                                ? new Date(sessionRecord.startedAt).toLocaleString("pt-BR")
                                : "-"}
                          </small>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </section>
            ) : null}

            {selectedTenant ? (
              <section
                className="surface panel-section panel-operations"
                id="analytics"
                data-operations-panel="analytics"
              >
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Medição</p>
                    <h2>Analytics</h2>
                    <p className="section-subtitle">
                      {selectedTenantAnalytics
                        ? `${selectedTenantAnalytics.totalEvents} evento(s) carregado(s).`
                        : "Nenhum evento analytics encontrado para este tenant."}
                    </p>
                  </div>
                </div>

                <dl className="session-grid tenant-summary">
                  <div>
                    <dt>Total de eventos</dt>
                    <dd>{selectedTenantAnalytics?.totalEvents ?? 0}</dd>
                  </div>
                  <div>
                    <dt>Tipos</dt>
                    <dd>{selectedTenantAnalytics?.eventTypeCounts?.length ?? 0}</dd>
                  </div>
                  <div>
                    <dt>Origens</dt>
                    <dd>{selectedTenantAnalytics?.originCounts?.length ?? 0}</dd>
                  </div>
                  <div>
                    <dt>Dominios</dt>
                    <dd>{selectedTenantAnalytics?.domainCounts?.length ?? 0}</dd>
                  </div>
                </dl>

                <div className="two-column compact">
                  <div className="list-card">
                    <strong>Eventos por tipo</strong>
                    {selectedTenantAnalytics?.eventTypeCounts?.length ? (
                      selectedTenantAnalytics.eventTypeCounts.map((item) => (
                        <div className="list-row" key={`event-type-${item.value}`}>
                          <span>{item.value}</span>
                          <span>{item.count}</span>
                        </div>
                      ))
                    ) : (
                      <p>Sem agregacoes disponiveis.</p>
                    )}
                  </div>

                  <div className="list-card">
                    <strong>Eventos recentes</strong>
                    {selectedTenantAnalytics?.events?.length ? (
                      selectedTenantAnalytics.events.slice(0, 8).map((event) => (
                        <div className="list-row" key={event.id}>
                          <div>
                            <strong>{event.eventType}</strong>
                            <p className="mono">
                              {event.payload.url
                                ? String(event.payload.url)
                                : (event.conversationId ?? "Sem contexto")}
                            </p>
                          </div>
                          <span>{new Date(event.createdAt).toLocaleString("pt-BR")}</span>
                        </div>
                      ))
                    ) : (
                      <p>Sem eventos registrados.</p>
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {selectedTenant ? (
              <section
                className="surface panel-section panel-operations"
                id="logs"
                data-operations-panel="logs"
              >
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Confiabilidade</p>
                    <h2>Logs e auditoria</h2>
                    <p className="section-subtitle">
                      {selectedTenantAuditLogs.length + selectedTenantSystemLogs.length === 0
                        ? "Nenhum log encontrado para este tenant."
                        : `${selectedTenantAuditLogs.length} audit log(s) e ${selectedTenantSystemLogs.length} system log(s) carregado(s).`}
                    </p>
                  </div>
                </div>

                <div className="two-column compact">
                  <div className="list-card">
                    <strong>Auditoria</strong>
                    {selectedTenantAuditLogs.length ? (
                      selectedTenantAuditLogs.map((log) => (
                        <div className="list-row" key={log.id}>
                          <div>
                            <strong>{log.action}</strong>
                            <p className="mono">
                              {log.targetType} {log.targetId}
                            </p>
                            <small>
                              {log.actorUserEmail ?? log.actorUserId ?? "Sistema"}
                              {log.correlationId ? ` · ${log.correlationId}` : ""}
                            </small>
                          </div>
                          <span>{new Date(log.createdAt).toLocaleString("pt-BR")}</span>
                        </div>
                      ))
                    ) : (
                      <p>Sem auditoria registrada.</p>
                    )}
                  </div>

                  <div className="list-card">
                    <strong>System logs</strong>
                    {selectedTenantSystemLogs.length ? (
                      selectedTenantSystemLogs.map((log) => (
                        <div className="list-row" key={log.id}>
                          <div>
                            <strong>{log.level.toUpperCase()}</strong>
                            <p>{log.message}</p>
                            <small>{log.correlationId ?? "Sem correlation id"}</small>
                          </div>
                          <span>{new Date(log.createdAt).toLocaleString("pt-BR")}</span>
                        </div>
                      ))
                    ) : (
                      <p>Sem system logs registrados.</p>
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {selectedTenant ? (
              <section
                className="surface panel-section panel-operations"
                id="conversations"
                data-operations-panel="conversations"
              >
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Atendimento</p>
                    <h2>Conversas</h2>
                    <p className="section-subtitle">
                      {selectedTenantConversationList.length === 0
                        ? "Nenhuma conversa encontrada para este tenant."
                        : `${selectedTenantConversationList.length} conversa(s) carregada(s).`}
                    </p>
                  </div>
                </div>

                <div className="two-column compact">
                  <div className="list-card">
                    {selectedTenantConversationList.length === 0 ? (
                      <p>Sem histórico disponível.</p>
                    ) : (
                      selectedTenantConversationList.map((conversation) => (
                        <button
                          key={conversation.id}
                          type="button"
                          className={`list-row ${conversation.id === selectedConversationId ? "is-selected" : ""}`}
                          onClick={() => handleSelectConversation(conversation.id)}
                        >
                          <div>
                            <strong>{conversation.visitorId ?? conversation.sessionId}</strong>
                            <p className="mono">
                              {conversation.currentPage ??
                                conversation.pageUrl ??
                                "Pagina nao informada"}
                            </p>
                            <small>
                              {conversation.status === "open" ? "Aberta" : "Fechada"} -{" "}
                              {conversation.messageCount} mensagem(s)
                            </small>
                          </div>
                          <div>
                            <small>
                              {conversation.lastMessageAt
                                ? new Date(conversation.lastMessageAt).toLocaleString("pt-BR")
                                : new Date(conversation.startedAt).toLocaleString("pt-BR")}
                            </small>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="surface">
                    {selectedConversationDetail ? (
                      <div className="stack">
                        <div className="section-heading">
                          <div>
                            <p className="eyebrow">Detalhe</p>
                            <h3>
                              {selectedConversationDetail.visitorId ??
                                selectedConversationDetail.sessionId}
                            </h3>
                            <p className="section-subtitle">
                              {selectedConversationDetail.currentPage ??
                                selectedConversationDetail.pageUrl ??
                                "Pagina nao informada"}
                            </p>
                          </div>
                        </div>

                        <dl className="session-grid">
                          <div>
                            <dt>Status</dt>
                            <dd>
                              {selectedConversationDetail.status === "open" ? "Aberta" : "Fechada"}
                            </dd>
                          </div>
                          <div>
                            <dt>Mensagens</dt>
                            <dd>{selectedConversationDetail.messageCount}</dd>
                          </div>
                          <div>
                            <dt>Inicio</dt>
                            <dd>
                              {new Date(selectedConversationDetail.startedAt).toLocaleString(
                                "pt-BR",
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt>Ultima atividade</dt>
                            <dd>
                              {selectedConversationDetail.lastMessageAt
                                ? new Date(selectedConversationDetail.lastMessageAt).toLocaleString(
                                    "pt-BR",
                                  )
                                : "-"}
                            </dd>
                          </div>
                        </dl>

                        <div className="list-card">
                          {selectedConversationMessages.length === 0 ? (
                            <p>Sem mensagens carregadas.</p>
                          ) : (
                            selectedConversationMessages.map((message) => (
                              <div className="message-row" key={message.id}>
                                <div>
                                  <strong>{message.role}</strong>
                                  <p className="mono">{message.type}</p>
                                </div>
                                <div>
                                  <p>
                                    {typeof message.content === "string"
                                      ? message.content
                                      : JSON.stringify(message.content)}
                                  </p>
                                  <small>
                                    {new Date(message.createdAt).toLocaleString("pt-BR")}
                                  </small>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="empty-state">
                        <strong>Selecione uma conversa.</strong>
                        <p>
                          Escolha um item da lista ao lado para abrir o histórico e os metadados.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {selectedTenant && selectedTenantAccess ? (
              <section className="three-column access-grid panel-section panel-access">
                <article
                  className="surface access-card panel-section panel-access"
                  id="users"
                  data-access-panel="users"
                >
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">Equipe</p>
                      <h2>Usuarios do tenant</h2>
                    </div>
                  </div>

                  <form className="stack" onSubmit={(event) => void handleInviteUserSubmit(event)}>
                    <label>
                      <span>E-mail</span>
                      <input
                        value={userInviteForm.email}
                        onChange={(event) =>
                          setUserInviteForm((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
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
                          setUserInviteForm((current) => ({
                            ...current,
                            roleSlug: event.target.value,
                          }))
                        }
                      >
                        {selectedTenantAccessRoles.map((role) => (
                          <option key={`invite-role-${role.slug}`} value={role.slug}>
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
                    {selectedTenantAccessUsers.map((user) => {
                      const userRoles = Array.isArray(user.roles) ? user.roles : [];

                      return (
                        <div className="user-row" key={user.id}>
                          <div>
                            <strong>{user.email}</strong>
                            <p>
                              {user.status === "active"
                                ? "Ativo"
                                : user.status === "invited"
                                  ? "Convidado"
                                  : "Suspenso"}
                            </p>
                            <small>
                              Convidado em{" "}
                              {new Date(
                                user.invitedAt ?? user.createdAt ?? user.updatedAt ?? Date.now(),
                              ).toLocaleDateString("pt-BR")}
                            </small>
                          </div>
                          <div className="user-actions">
                            <select
                              value={userRoles[0] ?? "viewer"}
                              onChange={(event) =>
                                void handleUpdateUserRoles(user.id, event.target.value)
                              }
                            >
                              {selectedTenantAccessRoles.map((role) => (
                                <option key={`user-role-${user.id}-${role.slug}`} value={role.slug}>
                                  {role.name}
                                </option>
                              ))}
                            </select>
                            <div className="chip-row">
                              {userRoles.map((roleSlug, index) => (
                                <span className="chip" key={`${user.id}-${roleSlug}-${index}`}>
                                  {roleSlug}
                                </span>
                              ))}
                            </div>
                            <button
                              type="button"
                              className="secondary"
                              onClick={() =>
                                void handleUpdateUserStatus(
                                  user.id,
                                  user.status === "suspended" ? "active" : "suspended",
                                )
                              }
                              disabled={viewState.loading}
                            >
                              {user.status === "suspended" ? "Reativar" : "Suspender"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>

                <article
                  className="surface access-card panel-section panel-access"
                  id="roles"
                  data-access-panel="roles"
                >
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">Acesso</p>
                      <h2>Roles e permissoes</h2>
                    </div>
                  </div>

                  <div className="list-card">
                    {selectedTenantAccessRoles.map((role) => {
                      const rolePermissions = Array.isArray(role.permissions)
                        ? role.permissions
                        : [];

                      return (
                        <div className="role-row" key={role.id}>
                          <div>
                            <strong>{role.name}</strong>
                            <p className="mono">{role.slug}</p>
                            <small>{role.description}</small>
                          </div>
                          <div className="chip-grid">
                            {rolePermissions.map((permission, index) => (
                              <span className="chip" key={`${role.id}-${permission}-${index}`}>
                                {permission}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="list-card permission-card">
                    <strong>Catálogo principal</strong>
                    <div className="chip-grid">
                      {accessPermissionCatalog.map((permission, index) => (
                        <span className="chip" key={`${permission}-${index}`}>
                          {permission}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>

                <article
                  className="surface access-card panel-section panel-access"
                  id="api-keys"
                  data-access-panel="api-keys"
                >
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">Credenciais</p>
                      <h2>API keys</h2>
                    </div>
                  </div>

                  {selectedTenantAccess.pendingSecret ? (
                    <div className="banner success secret-banner">
                      <div className="secret-banner-copy">
                        <strong>Segredo gerado uma unica vez</strong>
                        <code>{selectedTenantAccess.pendingSecret}</code>
                      </div>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => void handleCopyApiKeySecret()}
                      >
                        Copiar segredo
                      </button>
                    </div>
                  ) : null}

                  <form
                    className="stack"
                    onSubmit={(event) => void handleCreateApiKeySubmit(event)}
                  >
                    <label>
                      <span>Nome da chave</span>
                      <input
                        value={keyForm.name}
                        onChange={(event) =>
                          setKeyForm((current) => ({ ...current, name: event.target.value }))
                        }
                        placeholder="Key do painel"
                        required
                      />
                    </label>

                    <button type="submit" className="primary">
                      Criar chave
                    </button>
                  </form>

                  <div className="list-card">
                    {selectedTenantAccessApiKeys.map((key) => (
                      <div className="api-key-row" key={key.id}>
                        <div>
                          <strong>{key.name}</strong>
                          <p>
                            {key.prefix}...{key.last4}
                          </p>
                          <small>
                            {key.revokedAt
                              ? `Revogada em ${new Date(key.revokedAt).toLocaleDateString("pt-BR")}`
                              : "Ativa"}
                          </small>
                        </div>
                        <button
                          type="button"
                          className="secondary danger"
                          onClick={() => void handleRevokeApiKey(key.id)}
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

            <section className="surface session-card panel-section panel-overview">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Sessao</p>
                  <h2>Usuario autenticado</h2>
                </div>
              </div>

              <dl className="session-grid">
                <div>
                  <dt>Email</dt>
                  <dd>{session?.user?.email ?? "-"}</dd>
                </div>
                <div>
                  <dt>Tenant</dt>
                  <dd className="mono">{session?.user?.tenantId ?? "-"}</dd>
                </div>
                <div>
                  <dt>Roles</dt>
                  <dd>{session?.user?.roles?.join(", ") ?? "-"}</dd>
                </div>
              </dl>
            </section>
          </>
        )}
      </section>
    </main>
  );
};
