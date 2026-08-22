import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context.js";

export type SystemLogView = {
  id: string;
  tenantId: string | null;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  createdAt: string;
};

const LEVELS = ["", "debug", "info", "warn", "error"] as const;

export const SystemLogsPage = () => {
  const { apiClient } = useAuth();
  const [logs, setLogs] = useState<SystemLogView[]>([]);
  const [levelFilter, setLevelFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = levelFilter ? `?level=${levelFilter}` : "";
    apiClient
      .get<SystemLogView[]>(`/v1/admin/logs${query}`)
      .then(setLogs)
      .catch(() => setError("Nao foi possivel carregar os logs."));
  }, [apiClient, levelFilter]);

  return (
    <>
      <header>
        <p>Sistema</p>
        <h1>Logs</h1>
      </header>
      {error ? <p role="alert">{error}</p> : null}
      <form>
        <label htmlFor="system-logs-level">Nivel</label>
        <select
          id="system-logs-level"
          value={levelFilter}
          onChange={(event) => setLevelFilter(event.target.value)}
        >
          {LEVELS.map((level) => (
            <option key={level || "all"} value={level}>
              {level === "" ? "Todos" : level}
            </option>
          ))}
        </select>
      </form>
      <table>
        <thead>
          <tr>
            <th>Nivel</th>
            <th>Mensagem</th>
            <th>Cliente</th>
            <th>Quando</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{log.level}</td>
              <td>{log.message}</td>
              <td>{log.tenantId ?? "-"}</td>
              <td>{new Date(log.createdAt).toLocaleString("pt-BR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};
