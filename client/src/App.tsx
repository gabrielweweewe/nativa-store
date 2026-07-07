import { Spinner } from "@/components/ui/spinner";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import ProductPage from "@/pages/ProductPage";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

// Lazy: o painel admin (e a lib de planilhas usada na importação em massa) só é
// carregado quando alguém acessa /admin — não pesa o bundle da loja pública.
const AdminRouter = lazy(() => import("./pages/admin/AdminRouter"));

function AdminFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F0E8]">
      <Spinner className="size-8 text-[#C4522A]" />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/produto/:slug"} component={ProductPage} />
      <Route path="/admin/:rest*">
        <Suspense fallback={<AdminFallback />}>
          <AdminRouter />
        </Suspense>
      </Route>
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
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
