import RequireAdminAuth from "@/components/admin/RequireAdminAuth";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { AdminNotificationsProvider } from "@/contexts/AdminNotificationsContext";
import NotFound from "@/pages/NotFound";
import { Redirect, Route, Switch } from "wouter";
import AdminBanners from "./AdminBanners";
import AdminCustomerDetail from "./AdminCustomerDetail";
import AdminCustomersList from "./AdminCustomersList";
import AdminDashboard from "./AdminDashboard";
import AdminLogin from "./AdminLogin";
import AdminOrderDetail from "./AdminOrderDetail";
import AdminOrdersList from "./AdminOrdersList";
import AdminProductForm from "./AdminProductForm";
import AdminProductImport from "./AdminProductImport";
import AdminProductsList from "./AdminProductsList";

function ProtectedAdmin({ children }: { children: React.ReactNode }) {
  return (
    <RequireAdminAuth>
      <AdminNotificationsProvider>{children}</AdminNotificationsProvider>
    </RequireAdminAuth>
  );
}

/** Roteador do painel admin — carregado sob demanda (lazy) para não pesar o bundle da loja. */
export default function AdminRouter() {
  return (
    <AdminAuthProvider>
      <Switch>
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin">
          <Redirect to="/admin/dashboard" />
        </Route>
        <Route path="/admin/dashboard">
          <ProtectedAdmin>
            <AdminDashboard />
          </ProtectedAdmin>
        </Route>
        <Route path="/admin/produtos">
          <ProtectedAdmin>
            <AdminProductsList />
          </ProtectedAdmin>
        </Route>
        <Route path="/admin/produtos/importar">
          <ProtectedAdmin>
            <AdminProductImport />
          </ProtectedAdmin>
        </Route>
        <Route path="/admin/produtos/novo">
          <ProtectedAdmin>
            <AdminProductForm />
          </ProtectedAdmin>
        </Route>
        <Route path="/admin/produtos/:slug/editar">
          <ProtectedAdmin>
            <AdminProductForm />
          </ProtectedAdmin>
        </Route>
        <Route path="/admin/pedidos">
          <ProtectedAdmin>
            <AdminOrdersList />
          </ProtectedAdmin>
        </Route>
        <Route path="/admin/pedidos/:id">
          <ProtectedAdmin>
            <AdminOrderDetail />
          </ProtectedAdmin>
        </Route>
        <Route path="/admin/clientes">
          <ProtectedAdmin>
            <AdminCustomersList />
          </ProtectedAdmin>
        </Route>
        <Route path="/admin/clientes/:id">
          <ProtectedAdmin>
            <AdminCustomerDetail />
          </ProtectedAdmin>
        </Route>
        <Route path="/admin/banners">
          <ProtectedAdmin>
            <AdminBanners />
          </ProtectedAdmin>
        </Route>
        <Route>
          <ProtectedAdmin>
            <NotFound />
          </ProtectedAdmin>
        </Route>
      </Switch>
    </AdminAuthProvider>
  );
}
