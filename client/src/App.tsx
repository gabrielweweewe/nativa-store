import AuthHashRouter from "@/components/auth/AuthHashRouter";
import PixelRouteTracker from "@/components/analytics/PixelRouteTracker";
import StorePageViewTracker from "@/components/analytics/StorePageViewTracker";
import AccessibilityToolbar from "@/components/accessibility/AccessibilityToolbar";
import SkipLink from "@/components/accessibility/SkipLink";
import VLibrasWidget from "@/components/accessibility/VLibrasWidget";
import { Spinner } from "@/components/ui/spinner";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import { CustomerAuthProvider } from "@/contexts/CustomerAuthContext";
import NotFound from "@/pages/NotFound";
import ProductPage from "@/pages/ProductPage";
import { lazy, Suspense } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import CustomerLogin from "./pages/auth/CustomerLogin";
import CustomerRegister from "./pages/auth/CustomerRegister";
import CustomerAccount from "./pages/auth/CustomerAccount";
import CustomerForgotPassword from "./pages/auth/CustomerForgotPassword";
import CustomerResetPassword from "./pages/auth/CustomerResetPassword";
import CustomerVerifyEmail from "./pages/auth/CustomerVerifyEmail";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import WishlistPage from "./pages/WishlistPage";
import QuizPage from "./pages/QuizPage";
import { CartProvider } from "./contexts/CartContext";
import { WishlistProvider } from "./contexts/WishlistContext";
import { StoreDiscoveryProvider } from "./contexts/StoreDiscoveryContext";
import CartDrawer from "./components/cart/CartDrawer";
import StoreSearch from "./components/search/StoreSearch";
import QuickView from "./components/product/QuickView";
import ScrollToTop from "./components/ScrollToTop";
import WhatsAppFloatingButton from "./components/WhatsAppFloatingButton";

// Lazy: o painel admin (e a lib de planilhas usada na importação em massa) só é
// carregado quando alguém acessa /admin — não pesa o bundle da loja pública.
const AdminRouter = lazy(() => import("./pages/admin/AdminRouter"));

function AdminFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center admin-login-bg">
      <Spinner className="size-8 text-[#475569]" />
    </div>
  );
}

function Router() {
  const [location] = useLocation();

  // Verificação manual (em vez de <Route path="/admin/:rest*">): o padrão de wildcard do
  // wouter exige pelo menos um segmento após a barra, então não bate com "/admin" sozinho.
  if (location === "/admin" || location.startsWith("/admin/")) {
    return (
      <Suspense fallback={<AdminFallback />}>
        <AdminRouter />
      </Suspense>
    );
  }

  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/entrar"} component={CustomerLogin} />
      <Route path={"/cadastro"} component={CustomerRegister} />
      <Route path={"/recuperar-senha"} component={CustomerForgotPassword} />
      <Route path={"/redefinir-senha"} component={CustomerResetPassword} />
      <Route path={"/verificar-email"} component={CustomerVerifyEmail} />
      <Route path={"/conta"} component={CustomerAccount} />
      <Route path={"/carrinho"} component={CartPage} />
      <Route path={"/checkout"} component={CheckoutPage} />
      <Route path={"/favoritos"} component={WishlistPage} />
      <Route path={"/quiz"} component={QuizPage} />
      <Route path={"/produto/:slug"} component={ProductPage} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <AccessibilityProvider>
          <CustomerAuthProvider>
            <WishlistProvider>
              <CartProvider>
                <StoreDiscoveryProvider>
                  <AuthHashRouter />
                  <TooltipProvider>
                    <SkipLink />
                    <Toaster />
                    <StorePageViewTracker />
                    <PixelRouteTracker />
                    <ScrollToTop />
                    <CartDrawer />
                    <StoreSearch />
                    <QuickView />
                    <WhatsAppFloatingButton />
                    <AccessibilityToolbar />
                    <VLibrasWidget />
                    <div id="conteudo" tabIndex={-1}>
                      <Router />
                    </div>
                  </TooltipProvider>
                </StoreDiscoveryProvider>
              </CartProvider>
            </WishlistProvider>
          </CustomerAuthProvider>
        </AccessibilityProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
