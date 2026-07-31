import type { TenantAdminView } from "@faqchatbot/contracts";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context.js";

export const DashboardHomePage = () => {
  const { apiClient } = useAuth();
  const [tenants, setTenants] = useState<TenantAdminView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    apiClient
      .get<TenantAdminView[]>("/v1/admin/tenants")
      .then((result) => {
        if (!cancelled) {
          setTenants(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Nao foi possivel carregar os clientes.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiClient]);

  const total = tenants?.length ?? 0;
  const active = tenants?.filter((tenant) => tenant.status === "active").length ?? 0;

  return (
    <>
      <header>
        <p>Plataforma</p>
        <h1>Embeddable AI Platform</h1>
      </header>
      {error ? <p role="alert">{error}</p> : null}
      <div className="metric-grid">
        <article>
          <span>Clientes ativos</span>
          <strong>{active}</strong>
        </article>
        <article>
          <span>Total de clientes</span>
          <strong>{total}</strong>
        </article>
      </div>
    </>
  );
};
