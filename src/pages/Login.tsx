import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card"; // Removed CardDescription, CardHeader, CardTitle as they are not used in the new design
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
// import { Moon, Sun } from "lucide-react"; // Theme toggle is now a global component
// import megaBg from "@/assets/mega-bg.jpg"; // Not used in the new design
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth
import { fetchApi } from "@/config"; // Import fetchApi

const Login = () => {
  const [identifier, setIdentifier] = useState(""); // Can be username or email
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, user, isLoading: isAuthLoading } = useAuth(); // Get login function and user state

  // Redirect if user is already logged in
  useEffect(() => {
    if (user && !isAuthLoading) {
      if (user.role === 'admin') {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    }
  }, [user, isAuthLoading, navigate]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetchApi('/auth/login.php', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });

      const data = await response.json();

      if (response.ok && data.user) {
        login(data.user); // Update auth context
        toast({
          title: "Login realizado com sucesso!",
          description: data.user.role === 'admin' ? "Bem-vindo ao Painel Admin." : "Bem-vindo!",
        });
        // Navigation will be handled by the useEffect above
      } else {
        toast({
          title: "Erro no login",
          description: data.error || "Usuário ou senha incorretos.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Login API error:", error);
      toast({
        title: "Erro de Conexão",
        description: "Não foi possível conectar ao servidor. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, digite seu e-mail.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true); // Can use a separate loading state for this form if needed
    try {
      const response = await fetchApi('/auth/forgot_password.php', {
        method: 'POST',
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });
      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Solicitação Enviada",
          description: data.message || "Se o e-mail existir em nosso sistema, um link de recuperação será enviado.",
        });
        setForgotPasswordEmail("");
        setIsForgotPasswordOpen(false);
      } else {
        toast({
          title: "Erro",
          description: data.error || "Não foi possível processar sua solicitação.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Forgot password API error:", error);
      toast({
        title: "Erro de Conexão",
        description: "Não foi possível conectar ao servidor.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Se estiver carregando o estado de autenticação, pode mostrar um loader diferente
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    // The ThemeToggle component is now global and will be rendered by App.tsx or a layout component
    // The main div for Login will use theme variables for background
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      {/* Removed the specific theme toggle from this page */}

      {/* Login Form Container */}
      <div className="w-full max-w-md">
        <Card className="shadow-xl bg-card border-border rounded-lg"> {/* Added rounded-lg based on step 6 */}
          <CardContent className="p-8 space-y-6">
            {/* Logo and Title */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-lg flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-foreground">M</span>
              </div>
              <h1 className="text-3xl font-bold mb-2 text-primary">LOGIN</h1>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-sm font-medium text-foreground">Usuário ou E-mail</Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="Digite seu usuário ou e-mail"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="h-12 bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-ring focus:border-ring"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-ring focus:border-ring"
                  required
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-muted-foreground">
                  <input type="checkbox" className="rounded border-border focus:ring-ring text-primary" />
                  Remember me
                </label>
                <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="text-primary hover:text-primary/80 font-medium hover:underline transition-colors"
                    >
                      Esqueceu a Senha?
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md bg-card border-border">
                        <DialogHeader>
                          <DialogTitle>Recuperar Senha</DialogTitle>
                          <DialogDescription>
                            Digite seu e-mail para receber um link de recuperação de senha
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleForgotPassword} className="space-y-4">
                          <div>
                            <Label htmlFor="forgot-email" className="text-foreground">E-mail</Label>
                            <Input
                              id="forgot-email"
                              type="email"
                              placeholder="Digite seu e-mail"
                              value={forgotPasswordEmail}
                              onChange={(e) => setForgotPasswordEmail(e.target.value)}
                              className="h-11 bg-input border-border text-foreground placeholder:text-muted-foreground"
                              required
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsForgotPasswordOpen(false)} className="flex-1 border-border hover:bg-muted">
                              Cancelar
                            </Button>
                            <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                              Enviar
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                        Entrando...
                      </div>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </form>

                {/* Test Credentials Section - Themed */}
                <div className="p-4 bg-muted/50 rounded-lg text-sm">
                  <p className="font-semibold mb-2 text-center text-foreground">Credenciais de teste:</p>
                  <div className="space-y-1 text-center text-muted-foreground">
                    <p><strong>Admin:</strong> admin / admin123</p>
                    <p><strong>Usuário:</strong> user / user123</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      
    // No closing div for the main container here, it's already closed
  );
};

export default Login;