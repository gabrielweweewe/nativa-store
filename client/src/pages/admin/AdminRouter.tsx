import RequireAdminAuth from "@/components/admin/RequireAdminAuth";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import NotFound from "@/pages/NotFound";
import { Redirect, Route, Switch } from "wouter";
import AdminLogin from "./AdminLogin";
import AdminProductForm from "./AdminProductForm";
import AdminProductImport from "./AdminProductImport";
import AdminProductsList from "./AdminProductsList";

/** Roteador do painel admin — carregado sob demanda (lazy) para não pesar o bundle da loja. */
export default function AdminRouter() {
  return (
    <AdminAuthProvider>
      <Switch>
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin">
          <Redirect to="/admin/produtos" />
        </Route>
        <Route path="/admin/produtos">
          <RequireAdminAuth>
            <AdminProductsList />
          </RequireAdminAuth>
        </Route>
        <Route path="/admin/produtos/importar">
          <RequireAdminAuth>
            <AdminProductImport />
          </RequireAdminAuth>
        </Route>
        <Route path="/admin/produtos/novo">
          <RequireAdminAuth>
            <AdminProductForm />
          </RequireAdminAuth>
        </Route>
        <Route path="/admin/produtos/:slug/editar">
          <RequireAdminAuth>
            <AdminProductForm />
          </RequireAdminAuth>
        </Route>
        <Route>
          <RequireAdminAuth>
            <NotFound />
          </RequireAdminAuth>
        </Route>
      </Switch>
    </AdminAuthProvider>
  );
}
