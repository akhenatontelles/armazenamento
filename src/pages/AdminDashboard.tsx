import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import UserManagement from "@/components/UserManagement";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext"; // Added import

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading, logout } = useAuth(); // Added useAuth hook

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);

  const handleLogout = async () => {
    await logout();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="mega-header sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <h1 className="mega-logo text-xl">MegaCloud</h1>
          <Badge variant="secondary" className="text-xs">
            Admin Panel
          </Badge>
        </div>
        
        <div className="flex items-center gap-3"> {/* Adjusted gap slightly if needed after removing toggle */}
          {/* <ThemeToggle /> REMOVED as it's now global */}
          <span className="text-sm text-muted-foreground">
            Bem-vindo, {localStorage.getItem("username")}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="mega-button-secondary"
          >
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">Painel Administrativo</h2>
          <p className="text-muted-foreground">
            Gerencie usuários, arquivos e permissões do sistema
          </p>
        </div>

        <div className="space-y-6">
          <UserManagement />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;