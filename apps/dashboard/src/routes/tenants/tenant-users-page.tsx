import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../lib/auth-context.js";

type UserAdminView = { id: string; email: string; status: string; roleSlugs?: string[] };
type RoleAdminView = { id: string; slug: string; name: string; permissionSlugs: string[] };
type PermissionAdminView = { id: string; slug: string; description: string | null };

const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

export const TenantUsersPage = () => {
  const { id } = useParams<{ id: string }>();
  const tenantId = id ?? "";
  const { apiClient } = useAuth();

  const [users, setUsers] = useState<UserAdminView[]>([]);
  const [roles, setRoles] = useState<RoleAdminView[]>([]);
  const [permissions, setPermissions] = useState<PermissionAdminView[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [showUserForm, setShowUserForm] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [selectedRoleSlugs, setSelectedRoleSlugs] = useState<string[]>([]);

  const [showRoleForm, setShowRoleForm] = useState(false);
  const [roleSlug, setRoleSlug] = useState("");
  const [roleName, setRoleName] = useState("");
  const [selectedPermissionSlugs, setSelectedPermissionSlugs] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      apiClient.get<UserAdminView[]>(`/v1/admin/tenants/${tenantId}/users`),
      apiClient.get<RoleAdminView[]>(`/v1/admin/tenants/${tenantId}/roles`),
      apiClient.get<PermissionAdminView[]>("/v1/admin/permissions")
    ])
      .then(([usersResult, rolesResult, permissionsResult]) => {
        setUsers(usersResult);
        setRoles(rolesResult);
        setPermissions(permissionsResult);
      })
      .catch(() => setError("Nao foi possivel carregar usuarios e permissoes."));
  }, [apiClient, tenantId]);

  const handleCreateUser = async (event: FormEvent) => {
    event.preventDefault();
    const created = await apiClient.post<UserAdminView>(`/v1/admin/tenants/${tenantId}/users`, {
      email: userEmail,
      password: userPassword,
      roleSlugs: selectedRoleSlugs
    });
    setUsers((current) => [...current, { ...created, roleSlugs: selectedRoleSlugs }]);
    setUserEmail("");
    setUserPassword("");
    setSelectedRoleSlugs([]);
    setShowUserForm(false);
  };

  const handleCreateRole = async (event: FormEvent) => {
    event.preventDefault();
    const created = await apiClient.post<RoleAdminView>(`/v1/admin/tenants/${tenantId}/roles`, {
      slug: roleSlug,
      name: roleName,
      permissionSlugs: selectedPermissionSlugs
    });
    setRoles((current) => [...current, created]);
    setRoleSlug("");
    setRoleName("");
    setSelectedPermissionSlugs([]);
    setShowRoleForm(false);
  };

  return (
    <>
      <header>
        <p>Cliente</p>
        <h1>Usuarios e permissoes</h1>
      </header>
      {error ? <p role="alert">{error}</p> : null}

      <section aria-label="Usuarios">
        <h2>Usuarios</h2>
        <table>
          <thead>
            <tr>
              <th>E-mail</th>
              <th>Status</th>
              <th>Papeis</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{user.status}</td>
                <td>{(user.roleSlugs ?? []).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={() => setShowUserForm((current) => !current)}>
          Novo usuario
        </button>
        {showUserForm ? (
          <form onSubmit={(event) => void handleCreateUser(event)} noValidate>
            <label htmlFor="new-user-email">E-mail</label>
            <input id="new-user-email" value={userEmail} onChange={(event) => setUserEmail(event.target.value)} />
            <label htmlFor="new-user-password">Senha</label>
            <input
              id="new-user-password"
              type="password"
              value={userPassword}
              onChange={(event) => setUserPassword(event.target.value)}
            />
            <fieldset>
              <legend>Papeis</legend>
              {roles.map((role) => (
                <label key={role.id} htmlFor={`new-user-role-${role.id}`}>
                  <input
                    id={`new-user-role-${role.id}`}
                    type="checkbox"
                    checked={selectedRoleSlugs.includes(role.slug)}
                    onChange={() => setSelectedRoleSlugs((current) => toggle(current, role.slug))}
                  />
                  {role.slug}
                </label>
              ))}
            </fieldset>
            <button type="submit">Criar usuario</button>
          </form>
        ) : null}
      </section>

      <section aria-label="Papeis">
        <h2>Papeis</h2>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Slug</th>
              <th>Permissoes</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id}>
                <td>{role.name}</td>
                <td>{role.slug}</td>
                <td>{role.permissionSlugs.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={() => setShowRoleForm((current) => !current)}>
          Novo papel
        </button>
        {showRoleForm ? (
          <form onSubmit={(event) => void handleCreateRole(event)} noValidate>
            <label htmlFor="new-role-slug">Slug do papel</label>
            <input id="new-role-slug" value={roleSlug} onChange={(event) => setRoleSlug(event.target.value)} />
            <label htmlFor="new-role-name">Nome do papel</label>
            <input id="new-role-name" value={roleName} onChange={(event) => setRoleName(event.target.value)} />
            <fieldset>
              <legend>Permissoes</legend>
              {permissions.map((permission) => (
                <label key={permission.id} htmlFor={`new-role-permission-${permission.id}`}>
                  <input
                    id={`new-role-permission-${permission.id}`}
                    type="checkbox"
                    checked={selectedPermissionSlugs.includes(permission.slug)}
                    onChange={() => setSelectedPermissionSlugs((current) => toggle(current, permission.slug))}
                  />
                  {permission.slug}
                </label>
              ))}
            </fieldset>
            <button type="submit">Criar papel</button>
          </form>
        ) : null}
      </section>
    </>
  );
};
