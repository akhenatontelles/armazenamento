import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FileExplorer from "@/components/FileExplorer/index";
import { useToast } from "@/hooks/use-toast";
import { User, Settings, KeyRound, LogOut, ChevronDown } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const UserDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isAdminViewing = localStorage.getItem("adminViewingUser") === "true";
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    return (localStorage.getItem("userViewMode") as "list" | "grid") || "grid";
  });

  useEffect(() => {
    const userType = localStorage.getItem("userType");
    if (userType !== "user") {
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    localStorage.setItem("userViewMode", viewMode);
  }, [viewMode]);

  const handleLogout = () => {
    localStorage.removeItem("userType");
    localStorage.removeItem("username");
    localStorage.removeItem("adminViewingUser");
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate("/");
  };

  const handleBackToAdmin = () => {
    localStorage.setItem("userType", "admin");
    localStorage.setItem("username", "admin");
    localStorage.removeItem("adminViewingUser");
    navigate("/admin");
  };

  const handlePasswordReset = () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive"
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive"
      });
      return;
    }

    // Implementar lógica de redefinição de senha
    toast({
      title: "Senha redefinida",
      description: "Sua senha foi alterada com sucesso",
    });
    setNewPassword("");
    setConfirmPassword("");
    setIsPasswordResetOpen(false);
  };

  const currentUser = localStorage.getItem("username") || "Usuário";
  const userEmail = `${currentUser.toLowerCase()}@megacloud.com`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="mega-header sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <h1 className="mega-logo text-xl">MegaCloud</h1>
        </div>
        
        <div className="flex items-center gap-3"> {/* Adjusted gap slightly if needed after removing toggle */}
          {/* <ThemeToggle /> REMOVED as it's now global */}
          
          {isAdminViewing && (
            <Button
              variant="default"
              size="sm"
              onClick={handleBackToAdmin}
              className="mega-button-primary"
            >
              ← Voltar ao Admin
            </Button>
          )}

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 hover:bg-muted">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium text-xs">
                  {currentUser.length > 1 ? currentUser.substring(0, 2).toUpperCase() : currentUser.charAt(0).toUpperCase()}
                </div>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium">{currentUser}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </div>
              <DropdownMenuSeparator />
              
              <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <User className="w-4 h-4 mr-2" />
                    Ver Perfil
                  </DropdownMenuItem>
                </DialogTrigger>
              </Dialog>
              
              <Dialog open={isPasswordResetOpen} onOpenChange={setIsPasswordResetOpen}>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <KeyRound className="w-4 h-4 mr-2" />
                    Redefinir Senha
                  </DropdownMenuItem>
                </DialogTrigger>
              </Dialog>
              
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Profile Modal */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Perfil do Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                {currentUser.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{currentUser}</h3>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <Label className="text-sm font-medium">Nome de Usuário</Label>
                <p className="text-sm">{currentUser}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <p className="text-sm">{userEmail}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Tipo de Conta</Label>
                <p className="text-sm">{isAdminViewing ? "Admin (Visualizando)" : "Usuário"}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Reset Modal */}
      <Dialog open={isPasswordResetOpen} onOpenChange={setIsPasswordResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir Senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite sua nova senha"
                className="mega-input"
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirmar Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme sua nova senha"
                className="mega-input"
              />
            </div>
            <Button onClick={handlePasswordReset} className="mega-button-primary w-full">
              Redefinir Senha
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <p className="text-muted-foreground">
            Navegue, visualize e baixe seus arquivos
          </p>
        </div>

        <Card className="mega-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📁 Explorador de Arquivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FileExplorer isAdmin={isAdminViewing || false} defaultViewMode={viewMode} onViewModeChange={setViewMode} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserDashboard;