import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../lib/auth-context.js";

type ConversationAdminView = {
  id: string;
  sessionId: string;
  status: "open" | "closed";
  startedAt: string;
  endedAt: string | null;
};

export const TenantConversationsPage = () => {
  const { id } = useParams<{ id: string }>();
  const tenantId = id ?? "";
  const { apiClient } = useAuth();
  const [conversations, setConversations] = useState<ConversationAdminView[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<ConversationAdminView[]>(`/v1/admin/tenants/${tenantId}/conversations`)
      .then(setConversations)
      .catch(() => setError("Nao foi possivel carregar as conversas."));
  }, [apiClient, tenantId]);

  return (
    <>
      <header>
        <p>Cliente</p>
        <h1>Conversas</h1>
      </header>
      {error ? <p role="alert">{error}</p> : null}
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Sessao</th>
            <th>Status</th>
            <th>Iniciada em</th>
            <th>Encerrada em</th>
          </tr>
        </thead>
        <tbody>
          {conversations.map((conversation) => (
            <tr key={conversation.id}>
              <td>{conversation.id}</td>
              <td>{conversation.sessionId}</td>
              <td>{conversation.status}</td>
              <td>{new Date(conversation.startedAt).toLocaleString("pt-BR")}</td>
              <td>{conversation.endedAt ? new Date(conversation.endedAt).toLocaleString("pt-BR") : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};
