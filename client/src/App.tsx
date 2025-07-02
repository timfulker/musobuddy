import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Enquiries from "@/pages/enquiries";
import Contracts from "@/pages/contracts";
import Invoices from "@/pages/invoices";
import Calendar from "@/pages/calendar";
import Compliance from "@/pages/compliance";
import Settings from "@/pages/settings";
import SignContract from "@/pages/sign-contract";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Public contract signing route - no authentication required */}
      <Route path="/sign-contract/:id" component={SignContract} />
      
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/enquiries" component={Enquiries} />
          <Route path="/contracts" component={Contracts} />
          <Route path="/invoices" component={Invoices} />
          <Route path="/calendar" component={Calendar} />
          <Route path="/compliance" component={Compliance} />
          <Route path="/settings" component={Settings} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
