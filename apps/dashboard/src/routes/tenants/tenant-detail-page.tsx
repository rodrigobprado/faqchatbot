import type {
  TenantAdminView,
  TenantAgentConfigRequest,
  TenantConfigRequest,
  TenantDomainAdminView
} from "@faqchatbot/contracts";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../../lib/api-client.js";
import { useAuth } from "../../lib/auth-context.js";

type RateLimitScope = "ip" | "tenant" | "api_key" | "visitor" | "conversation";
type EffectiveRateLimit = { scope: RateLimitScope; limit: number; windowSeconds: number };
type RateLimits = { effective: EffectiveRateLimit[] };

const DEFAULT_CONFIG: TenantConfigRequest = {
  theme: "auto",
  primaryColor: "#2563eb",
  initialMessage: "",
  placeholder: ""
};

const DEFAULT_AGENT_CONFIG: TenantAgentConfigRequest = {
  provider: "n8n",
  timeoutMs: 15000,
  retryPolicy: {}
};

export const TenantDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const tenantId = id ?? "";
  const { apiClient } = useAuth();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState<TenantAdminView | null>(null);
  const [domains, setDomains] = useState<TenantDomainAdminView[]>([]);
  const [config, setConfig] = useState<TenantConfigRequest | null>(null);
  const [agentConfig, setAgentConfig] = useState<TenantAgentConfigRequest | null>(null);
  const [rateLimits, setRateLimits] = useState<RateLimits | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [newDomain, setNewDomain] = useState("");
  const [webhookSecretRef, setWebhookSecretRef] = useState("");
  const [basicError, setBasicError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get<TenantAdminView>(`/v1/admin/tenants/${tenantId}`),
      apiClient.get<TenantDomainAdminView[]>(`/v1/admin/tenants/${tenantId}/domains`),
      apiClient.get<TenantConfigRequest | null>(`/v1/admin/tenants/${tenantId}/config`),
      apiClient.get<TenantAgentConfigRequest | null>(`/v1/admin/tenants/${tenantId}/agent-config`),
      apiClient.get<RateLimits>(`/v1/admin/tenants/${tenantId}/rate-limits`)
    ])
      .then(([tenantResult, domainsResult, configResult, agentConfigResult, rateLimitsResult]) => {
        setTenant(tenantResult);
        setDomains(domainsResult);
        setConfig(configResult ?? DEFAULT_CONFIG);
        setAgentConfig(agentConfigResult ?? DEFAULT_AGENT_CONFIG);
        setRateLimits(rateLimitsResult);
      })
      .catch(() => setLoadError("Nao foi possivel carregar os dados do cliente."));
  }, [apiClient, tenantId]);

  if (loadError) {
    return <p role="alert">{loadError}</p>;
  }

  if (!tenant || !config || !agentConfig || !rateLimits) {
    return <p>Carregando...</p>;
  }

  const handleSaveBasic = async (event: FormEvent) => {
    event.preventDefault();
    setBasicError(null);
    try {
      const updated = await apiClient.patch<TenantAdminView>(`/v1/admin/tenants/${tenantId}`, {
        name: tenant.name,
        status: tenant.status,
        planId: tenant.planId,
        defaultLocale: tenant.defaultLocale
      });
      setTenant(updated);
    } catch (err) {
      setBasicError(err instanceof ApiError ? err.message : "Nao foi possivel salvar.");
    }
  };

  const handleDelete = async () => {
    await apiClient.delete(`/v1/admin/tenants/${tenantId}`);
    navigate("/tenants");
  };

  const handleAddDomain = async (event: FormEvent) => {
    event.preventDefault();
    if (!newDomain.trim()) {
      return;
    }
    const created = await apiClient.post<TenantDomainAdminView>(`/v1/admin/tenants/${tenantId}/domains`, {
      domain: newDomain
    });
    setDomains((current) => [...current, created]);
    setNewDomain("");
  };

  const handleRemoveDomain = async (domainId: string) => {
    await apiClient.delete(`/v1/admin/tenants/${tenantId}/domains/${domainId}`);
    setDomains((current) => current.filter((domainRow) => domainRow.id !== domainId));
  };

  const handleSaveConfig = async (event: FormEvent) => {
    event.preventDefault();
    const updated = await apiClient.put<TenantConfigRequest>(`/v1/admin/tenants/${tenantId}/config`, config);
    setConfig(updated);
  };

  const handleSaveAgentConfig = async (event: FormEvent) => {
    event.preventDefault();
    const payload: TenantAgentConfigRequest = {
      ...agentConfig,
      ...(webhookSecretRef ? { webhookSecretRef } : {})
    };
    const updated = await apiClient.put<TenantAgentConfigRequest>(
      `/v1/admin/tenants/${tenantId}/agent-config`,
      payload,
    );
    setAgentConfig(updated);
    setWebhookSecretRef("");
  };

  const handleSaveRateLimit = async (row: EffectiveRateLimit) => {
    const updated = await apiClient.put<EffectiveRateLimit>(`/v1/admin/tenants/${tenantId}/rate-limits`, row);
    setRateLimits((current) =>
      current
        ? {
            effective: current.effective.map((existing) =>
              existing.scope === updated.scope ? updated : existing,
            )
          }
        : current,
    );
  };

  const updateEffectiveRow = (scope: RateLimitScope, patch: Partial<EffectiveRateLimit>) => {
    setRateLimits((current) =>
      current
        ? { effective: current.effective.map((row) => (row.scope === scope ? { ...row, ...patch } : row)) }
        : current,
    );
  };

  return (
    <>
      <header>
        <p>Cliente</p>
        <h1>{tenant.name}</h1>
        <a
          href={`/tenants/${tenantId}/analytics`}
          onClick={(event) => {
            event.preventDefault();
            navigate(`/tenants/${tenantId}/analytics`);
          }}
        >
          Ver analytics
        </a>
        {" | "}
        <a
          href={`/tenants/${tenantId}/conversations`}
          onClick={(event) => {
            event.preventDefault();
            navigate(`/tenants/${tenantId}/conversations`);
          }}
        >
          Ver conversas
        </a>
        {" | "}
        <a
          href={`/tenants/${tenantId}/sessions`}
          onClick={(event) => {
            event.preventDefault();
            navigate(`/tenants/${tenantId}/sessions`);
          }}
        >
          Ver sessoes
        </a>
        {" | "}
        <a
          href={`/tenants/${tenantId}/audit-logs`}
          onClick={(event) => {
            event.preventDefault();
            navigate(`/tenants/${tenantId}/audit-logs`);
          }}
        >
          Ver logs
        </a>
        {" | "}
        <a
          href={`/tenants/${tenantId}/users`}
          onClick={(event) => {
            event.preventDefault();
            navigate(`/tenants/${tenantId}/users`);
          }}
        >
          Ver usuarios
        </a>
      </header>

      <section aria-label="Dados basicos">
        <h2>Dados</h2>
        {basicError ? <p role="alert">{basicError}</p> : null}
        <form onSubmit={(event) => void handleSaveBasic(event)} noValidate>
          <label htmlFor="tenant-detail-name">Nome</label>
          <input
            id="tenant-detail-name"
            value={tenant.name}
            onChange={(event) => setTenant({ ...tenant, name: event.target.value })}
          />
          <label htmlFor="tenant-detail-status">Status</label>
          <select
            id="tenant-detail-status"
            value={tenant.status}
            onChange={(event) => setTenant({ ...tenant, status: event.target.value as TenantAdminView["status"] })}
          >
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
            <option value="suspended">Suspenso</option>
          </select>
          <label htmlFor="tenant-detail-locale">Idioma padrao</label>
          <input
            id="tenant-detail-locale"
            value={tenant.defaultLocale}
            onChange={(event) => setTenant({ ...tenant, defaultLocale: event.target.value })}
          />
          <button type="submit">Salvar dados</button>
        </form>
        <button type="button" onClick={() => void handleDelete()}>
          Remover cliente
        </button>
      </section>

      <section aria-label="Dominios autorizados">
        <h2>Dominios autorizados</h2>
        <ul>
          {domains.map((domainRow) => (
            <li key={domainRow.id}>
              {domainRow.domain}
              <button type="button" onClick={() => void handleRemoveDomain(domainRow.id)}>
                Remover {domainRow.domain}
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={(event) => void handleAddDomain(event)} noValidate>
          <label htmlFor="tenant-new-domain">Novo dominio</label>
          <input id="tenant-new-domain" value={newDomain} onChange={(event) => setNewDomain(event.target.value)} />
          <button type="submit">Adicionar dominio</button>
        </form>
      </section>

      <section aria-label="Aparencia">
        <h2>Aparencia</h2>
        <form onSubmit={(event) => void handleSaveConfig(event)} noValidate>
          <label htmlFor="tenant-theme">Tema</label>
          <select
            id="tenant-theme"
            value={config.theme}
            onChange={(event) => setConfig({ ...config, theme: event.target.value as TenantConfigRequest["theme"] })}
          >
            <option value="light">Claro</option>
            <option value="dark">Escuro</option>
            <option value="auto">Automatico</option>
          </select>
          <label htmlFor="tenant-primary-color">Cor primaria</label>
          <input
            id="tenant-primary-color"
            value={config.primaryColor}
            onChange={(event) => setConfig({ ...config, primaryColor: event.target.value })}
          />
          <label htmlFor="tenant-initial-message">Mensagem inicial</label>
          <input
            id="tenant-initial-message"
            value={config.initialMessage}
            onChange={(event) => setConfig({ ...config, initialMessage: event.target.value })}
          />
          <button type="submit">Salvar aparencia</button>
        </form>
      </section>

      <section aria-label="Agente">
        <h2>Agente</h2>
        <form onSubmit={(event) => void handleSaveAgentConfig(event)} noValidate>
          <label htmlFor="tenant-agent-provider">Provedor</label>
          <select
            id="tenant-agent-provider"
            value={agentConfig.provider}
            onChange={(event) =>
              setAgentConfig({ ...agentConfig, provider: event.target.value as TenantAgentConfigRequest["provider"] })
            }
          >
            <option value="n8n">n8n</option>
            <option value="openai_responses">OpenAI Responses</option>
            <option value="langgraph">LangGraph</option>
            <option value="flowise">Flowise</option>
            <option value="dify">Dify</option>
            <option value="crewai">CrewAI</option>
            <option value="mcp">MCP</option>
            <option value="custom">Custom</option>
          </select>
          <label htmlFor="tenant-agent-webhook-url">URL do webhook</label>
          <input
            id="tenant-agent-webhook-url"
            value={agentConfig.webhookUrl ?? ""}
            onChange={(event) => setAgentConfig({ ...agentConfig, webhookUrl: event.target.value })}
          />
          <label htmlFor="tenant-agent-webhook-secret">Segredo do webhook</label>
          <input
            id="tenant-agent-webhook-secret"
            type="password"
            placeholder="Deixe em branco para manter o atual"
            value={webhookSecretRef}
            onChange={(event) => setWebhookSecretRef(event.target.value)}
          />
          <button type="submit">Salvar agente</button>
        </form>
      </section>

      <section aria-label="Limites de uso">
        <h2>Rate limits</h2>
        <table>
          <thead>
            <tr>
              <th>Escopo</th>
              <th>Limite</th>
              <th>Janela (s)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rateLimits.effective.map((row) => (
              <tr key={row.scope}>
                <td>{row.scope}</td>
                <td>
                  <label htmlFor={`rate-limit-${row.scope}`}>Limite para {row.scope}</label>
                  <input
                    id={`rate-limit-${row.scope}`}
                    type="number"
                    value={row.limit}
                    onChange={(event) => updateEffectiveRow(row.scope, { limit: Number(event.target.value) })}
                  />
                </td>
                <td>
                  <input
                    aria-label={`Janela para ${row.scope}`}
                    type="number"
                    value={row.windowSeconds}
                    onChange={(event) =>
                      updateEffectiveRow(row.scope, { windowSeconds: Number(event.target.value) })
                    }
                  />
                </td>
                <td>
                  <button type="button" onClick={() => void handleSaveRateLimit(row)}>
                    Salvar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
};
