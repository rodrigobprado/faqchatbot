import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../../lib/api-client.js";
import { useAuth } from "../../lib/auth-context.js";

type PlanAdminView = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  limits: { messagesPerMinute?: number };
};

export const PlansPage = () => {
  const { apiClient } = useAuth();
  const [plans, setPlans] = useState<PlanAdminView[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const loadPlans = () => {
    apiClient
      .get<PlanAdminView[]>("/v1/admin/plans")
      .then(setPlans)
      .catch(() => setLoadError("Nao foi possivel carregar os planos."));
  };

  useEffect(loadPlans, [apiClient]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!slug.trim() || !name.trim()) {
      setFormError("Informe slug e nome do plano.");
      return;
    }

    try {
      const created = await apiClient.post<PlanAdminView>("/v1/admin/plans", { slug, name });
      setPlans((current) => [...current, created]);
      setSlug("");
      setName("");
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Nao foi possivel criar o plano.");
    }
  };

  const handleUpdateLimit = async (plan: PlanAdminView, messagesPerMinute: number) => {
    const updated = await apiClient.patch<PlanAdminView>(`/v1/admin/plans/${plan.id}`, {
      limits: { ...plan.limits, messagesPerMinute }
    });
    setPlans((current) => current.map((row) => (row.id === updated.id ? updated : row)));
  };

  return (
    <>
      <header>
        <p>Plataforma</p>
        <h1>Planos</h1>
      </header>
      {loadError ? <p role="alert">{loadError}</p> : null}
      <button type="button" onClick={() => setShowForm((current) => !current)}>
        Novo plano
      </button>
      {showForm ? (
        <form onSubmit={(event) => void handleCreate(event)} noValidate>
          {formError ? <p role="alert">{formError}</p> : null}
          <label htmlFor="plan-slug">Slug</label>
          <input id="plan-slug" value={slug} onChange={(event) => setSlug(event.target.value)} />
          <label htmlFor="plan-name">Nome</label>
          <input id="plan-name" value={name} onChange={(event) => setName(event.target.value)} />
          <button type="submit">Criar plano</button>
        </form>
      ) : null}
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Slug</th>
            <th>Preco (centavos)</th>
            <th>Mensagens/min</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => (
            <tr key={plan.id}>
              <td>{plan.name}</td>
              <td>{plan.slug}</td>
              <td>{plan.priceCents}</td>
              <td>
                <label htmlFor={`plan-limit-${plan.id}`}>Mensagens por minuto para {plan.name}</label>
                <input
                  id={`plan-limit-${plan.id}`}
                  type="number"
                  defaultValue={plan.limits.messagesPerMinute ?? 0}
                  onBlur={(event) => void handleUpdateLimit(plan, Number(event.target.value))}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};
