import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth-context.js";

export const NAV_ITEMS: readonly { to: string; label: string }[] = [
  { to: "/", label: "Dashboard" },
  { to: "/tenants", label: "Clientes" },
  { to: "/plans", label: "Planos" },
  { to: "/logs", label: "Logs" }
];

export const AdminLayout = () => {
  const { user, logout } = useAuth();

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navegacao principal">
        <strong>faqchatbot</strong>
        <nav>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span>{user?.email}</span>
          <button type="button" onClick={logout}>
            Sair
          </button>
        </div>
      </aside>
      <section className="content">
        <Outlet />
      </section>
    </main>
  );
};
