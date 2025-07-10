import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import NotFound from "./pages/NotFound";
import ResetPasswordPage from "./pages/ResetPasswordPage"; // Import ResetPasswordPage
import ProtectedRoute from "./components/ProtectedRoute"; // Import ProtectedRoute
import { ThemeToggle } from "./components/ThemeToggle";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster /> {/* For shadcn/ui toasts via useToast from @/hooks/use-toast */}
      {/* <Sonner /> */} {/* Se Sonner for usado separadamente, mantenha. Se useToast já usa Sonner, pode ser redundante. Assumindo que Toaster é o principal. */}
      <BrowserRouter basename="/armarzenamento">
        <ThemeToggle /> {/* Global theme toggle */}
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Login />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['user', 'admin']} />}>
            {/* Admin também pode acessar dashboard de usuário se houver lógica para isso, ou apenas 'user' */}
            <Route path="/dashboard" element={<UserDashboard />} />
          </Route>

          {/* Catch-all Not Found Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
