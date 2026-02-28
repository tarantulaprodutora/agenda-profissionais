import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AgendaPage from "./pages/AgendaPage";
import AdminPage from "./pages/AdminPage";
import LoginPage from "./pages/LoginPage";
import ProfessionalsPage from "./pages/ProfessionalsPage";
import ReportsPage from "./pages/ReportsPage";
import ProtectedRoute from "./components/ProtectedRoute";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={AgendaPage} />
      <Route path={"/agenda"} component={AgendaPage} />
      <Route path={"/login"} component={LoginPage} />
      <Route path={"/admin"}>
        <ProtectedRoute requiredRole="admin">
          <AdminPage />
        </ProtectedRoute>
      </Route>
      <Route path={"/professionals"} component={ProfessionalsPage} />
      <Route path={"/reports"} component={ReportsPage} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
