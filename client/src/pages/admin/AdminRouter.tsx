import RequireAdminAuth from "@/components/admin/RequireAdminAuth";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { AdminNotificationsProvider } from "@/contexts/AdminNotificationsContext";
import { usePageMeta } from "@/lib/seo";
import NotFound from "@/pages/NotFound";
import { Redirect, Route, Switch } from "wouter";
import AdminBanners from "./AdminBanners";
import AdminCoupons from "./AdminCoupons";
import AdminCustomerDetail from "./AdminCustomerDetail";
import AdminCustomersList from "./AdminCustomersList";
import AdminDashboard from "./AdminDashboard";
import AdminEmailCampaignEditor from "./AdminEmailCampaignEditor";
import AdminEmailCampaigns from "./AdminEmailCampaigns";
import AdminEmailContacts from "./AdminEmailContacts";
import AdminEmailLists from "./AdminEmailLists";
import AdminIntegrations from "./AdminIntegrations";
import AdminLogin from "./AdminLogin";
import AdminOrderDetail from "./AdminOrderDetail";
import AdminOrdersList from "./AdminOrdersList";
import AdminProductForm from "./AdminProductForm";
import AdminProductImport from "./AdminProductImport";
import AdminProductsList from "./AdminProductsList";
import AdminQuiz from "./AdminQuiz";
import AdminRegions from "./AdminRegions";

function ProtectedAdmin({ children }: { children: React.ReactNode }) {
  return (
    <RequireAdminAuth>
      <AdminNotificationsProvider>{children}</AdminNotificationsProvider>
    </RequireAdminAuth>
  );
}

function AdminSeo() {
  usePageMeta({
    title: "Admin — Nativa Store",
    description: "Painel administrativo da Nativa Store.",
    noIndex: true,
  });
  return null;
}

/** Roteador do painel admin — carregado sob demanda (lazy) para não pesar o bundle da loja. */
export default function AdminRouter() {
  return (
    <AdminAuthProvider>
      <AdminSeo />
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
        <Route path="/admin/cupons">
          <ProtectedAdmin>
            <AdminCoupons />
          </ProtectedAdmin>
        </Route>
        <Route path="/admin/quiz">
          <ProtectedAdmin>
            <AdminQuiz />
          </ProtectedAdmin>
        </Route>
        <Route path="/admin/regioes">
          <ProtectedAdmin>
            <AdminRegions />
          </ProtectedAdmin>
        </Route>
        <Route path="/admin/integracoes">
          <ProtectedAdmin>
            <AdminIntegrations />
          </ProtectedAdmin>
        </Route>
        <Route path="/admin/email-marketing">
          <Redirect to="/admin/email-marketing/campanhas" />
        </Route>
        <Route path="/admin/email-marketing/campanhas">
          <ProtectedAdmin>
            <AdminEmailCampaigns />
          </ProtectedAdmin>
        </Route>
        <Route path="/admin/email-marketing/campanhas/nova">
          <ProtectedAdmin>
            <AdminEmailCampaignEditor />
          </ProtectedAdmin>
        </Route>
        <Route path="/admin/email-marketing/campanhas/:id/editar">
          <ProtectedAdmin>
            <AdminEmailCampaignEditor />
          </ProtectedAdmin>
        </Route>
        <Route path="/admin/email-marketing/listas">
          <ProtectedAdmin>
            <AdminEmailLists />
          </ProtectedAdmin>
        </Route>
        <Route path="/admin/email-marketing/contatos">
          <ProtectedAdmin>
            <AdminEmailContacts />
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
