import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../lib/auth-context.js";

type AnalyticsResponse = {
  period: { from: string; to: string };
  totalsByEventType: { eventType: string; count: number }[];
  averageResponseTimeMs: number | null;
  averageConversationDurationMs: number | null;
};

export const TenantAnalyticsPage = () => {
  const { id } = useParams<{ id: string }>();
  const tenantId = id ?? "";
  const { apiClient } = useAuth();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    apiClient
      .get<AnalyticsResponse>(`/v1/admin/tenants/${tenantId}/analytics`, {
        from: from || undefined,
        to: to || undefined
      })
      .then(setData)
      .catch(() => setError("Nao foi possivel carregar as analytics."));
  };

  useEffect(load, [apiClient, tenantId]);

  return (
    <>
      <header>
        <p>Cliente</p>
        <h1>Analytics</h1>
      </header>
      {error ? <p role="alert">{error}</p> : null}
      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          load();
        }}
        noValidate
      >
        <label htmlFor="analytics-from">De</label>
        <input id="analytics-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        <label htmlFor="analytics-to">Ate</label>
        <input id="analytics-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        <button type="submit">Filtrar</button>
      </form>
      {data ? (
        <>
          <div className="metric-grid">
            <article>
              <span>Tempo medio de resposta</span>
              <strong>{data.averageResponseTimeMs !== null ? `${data.averageResponseTimeMs} ms` : "-"}</strong>
            </article>
            <article>
              <span>Duracao media de conversa</span>
              <strong>
                {data.averageConversationDurationMs !== null ? `${data.averageConversationDurationMs} ms` : "-"}
              </strong>
            </article>
          </div>
          <table>
            <thead>
              <tr>
                <th>Evento</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {data.totalsByEventType.map((row) => (
                <tr key={row.eventType}>
                  <td>{row.eventType}</td>
                  <td>{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </>
  );
};
