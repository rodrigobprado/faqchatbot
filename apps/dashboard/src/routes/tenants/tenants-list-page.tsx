import { createTenantRequestSchema, type TenantAdminView } from "@faqchatbot/contracts";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../../lib/api-client.js";
import { useAuth } from "../../lib/auth-context.js";

export const TenantsListPage = () => {
  const { apiClient } = useAuth();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<TenantAdminView[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [publicId, setPublicId] = useState("");
  const [name, setName] = useState("");
  const [planId, setPlanId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadTenants = () => {
    apiClient
      .get<TenantAdminView[]>("/v1/admin/tenants")
      .then(setTenants)
      .catch(() => setLoadError("Nao foi possivel carregar os clientes."));
  };

  useEffect(loadTenants, [apiClient]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const parsed = createTenantRequestSchema.safeParse({ publicId, name, planId, defaultLocale: "pt-BR" });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Dados invalidos.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await apiClient.post<TenantAdminView>("/v1/admin/tenants", parsed.data);
      navigate(`/tenants/${created.id}`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Nao foi possivel criar o cliente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <header>
        <p>Plataforma</p>
        <h1>Clientes</h1>
      </header>
      {loadError ? <p role="alert">{loadError}</p> : null}
      <button type="button" onClick={() => setShowForm((current) => !current)}>
        Novo cliente
      </button>
      {showForm ? (
        <form onSubmit={(event) => void handleCreate(event)} noValidate>
          {formError ? <p role="alert">{formError}</p> : null}
          <label htmlFor="tenant-public-id">Identificador publico</label>
          <input id="tenant-public-id" value={publicId} onChange={(event) => setPublicId(event.target.value)} />
          <label htmlFor="tenant-name">Nome</label>
          <input id="tenant-name" value={name} onChange={(event) => setName(event.target.value)} />
          <label htmlFor="tenant-plan-id">ID do plano</label>
          <input id="tenant-plan-id" value={planId} onChange={(event) => setPlanId(event.target.value)} />
          <button type="submit" disabled={submitting}>
            Criar cliente
          </button>
        </form>
      ) : null}
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Identificador</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((tenant) => (
            <tr key={tenant.id}>
              <td>
                <a
                  href={`/tenants/${tenant.id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    navigate(`/tenants/${tenant.id}`);
                  }}
                >
                  {tenant.name}
                </a>
              </td>
              <td>{tenant.publicId}</td>
              <td>{tenant.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};
