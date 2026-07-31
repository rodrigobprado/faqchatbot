import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../lib/auth-context.js";

type SessionAdminView = {
  id: string;
  visitorId: string;
  startedAt: string;
  lastSeenAt: string;
  pageContext: { url?: string };
};

export const TenantSessionsPage = () => {
  const { id } = useParams<{ id: string }>();
  const tenantId = id ?? "";
  const { apiClient } = useAuth();
  const [sessions, setSessions] = useState<SessionAdminView[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<SessionAdminView[]>(`/v1/admin/tenants/${tenantId}/sessions`)
      .then(setSessions)
      .catch(() => setError("Nao foi possivel carregar as sessoes."));
  }, [apiClient, tenantId]);

  return (
    <>
      <header>
        <p>Cliente</p>
        <h1>Sessoes</h1>
      </header>
      {error ? <p role="alert">{error}</p> : null}
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Visitante</th>
            <th>URL</th>
            <th>Iniciada em</th>
            <th>Ultima atividade</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.id}>
              <td>{session.id}</td>
              <td>{session.visitorId}</td>
              <td>{session.pageContext.url ?? "-"}</td>
              <td>{new Date(session.startedAt).toLocaleString("pt-BR")}</td>
              <td>{new Date(session.lastSeenAt).toLocaleString("pt-BR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};
