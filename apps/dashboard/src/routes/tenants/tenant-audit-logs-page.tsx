import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../lib/auth-context.js";

type AuditLogAdminView = {
  id: string;
  actorUserId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
};

export const TenantAuditLogsPage = () => {
  const { id } = useParams<{ id: string }>();
  const tenantId = id ?? "";
  const { apiClient } = useAuth();
  const [logs, setLogs] = useState<AuditLogAdminView[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<AuditLogAdminView[]>(`/v1/admin/tenants/${tenantId}/audit-logs`)
      .then(setLogs)
      .catch(() => setError("Nao foi possivel carregar os logs."));
  }, [apiClient, tenantId]);

  return (
    <>
      <header>
        <p>Cliente</p>
        <h1>Logs de auditoria</h1>
      </header>
      {error ? <p role="alert">{error}</p> : null}
      <table>
        <thead>
          <tr>
            <th>Acao</th>
            <th>Alvo</th>
            <th>ID do alvo</th>
            <th>Quando</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{log.action}</td>
              <td>{log.targetType}</td>
              <td>{log.targetId}</td>
              <td>{new Date(log.createdAt).toLocaleString("pt-BR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};
