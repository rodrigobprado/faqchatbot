import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./lib/auth-context.js";
import { RequireAuth } from "./lib/require-auth.js";
import { AdminLayout } from "./routes/admin-layout.js";
import { DashboardHomePage } from "./routes/dashboard-home-page.js";
import { LoginPage } from "./routes/login-page.js";
import { PlansPage } from "./routes/plans/plans-page.js";
import { TenantAnalyticsPage } from "./routes/tenants/tenant-analytics-page.js";
import { TenantAuditLogsPage } from "./routes/tenants/tenant-audit-logs-page.js";
import { TenantConversationsPage } from "./routes/tenants/tenant-conversations-page.js";
import { TenantDetailPage } from "./routes/tenants/tenant-detail-page.js";
import { TenantSessionsPage } from "./routes/tenants/tenant-sessions-page.js";
import { TenantUsersPage } from "./routes/tenants/tenant-users-page.js";
import { TenantsListPage } from "./routes/tenants/tenants-list-page.js";

export const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<DashboardHomePage />} />
          <Route path="/tenants" element={<TenantsListPage />} />
          <Route path="/tenants/:id" element={<TenantDetailPage />} />
          <Route path="/tenants/:id/analytics" element={<TenantAnalyticsPage />} />
          <Route path="/tenants/:id/conversations" element={<TenantConversationsPage />} />
          <Route path="/tenants/:id/sessions" element={<TenantSessionsPage />} />
          <Route path="/tenants/:id/audit-logs" element={<TenantAuditLogsPage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/tenants/:id/users" element={<TenantUsersPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);
