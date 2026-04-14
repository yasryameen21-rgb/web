import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import SignUp from "./pages/SignUp";
import Welcome from "./pages/Welcome";
import page from "./pages/page";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/signup"} component={SignUp} />
      <Route path={"/welcome"} component={Welcome} />
      <Route path={"/404"} component={NotFound} />
      <Route path="/page" component={page} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <div dir="rtl" className="min-h-screen">
            <Router />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
