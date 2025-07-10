import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { fetchApi } from '@/config'; // Import fetchApi
import { ThemeToggle } from '@/components/ThemeToggle'; // Se quiser o toggle na página

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      setError("Token de redefinição não fornecido ou inválido.");
      toast({
        title: "Erro",
        description: "Token de redefinição ausente. Por favor, use o link enviado para seu e-mail.",
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [searchParams, toast]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!token) {
      setError("Token inválido ou ausente.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      toast({ title: "Erro", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetchApi('/auth/reset_password.php', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || "Senha redefinida com sucesso! Você pode fazer login agora.");
        toast({ title: "Sucesso", description: data.message || "Senha redefinida com sucesso!" });
        setTimeout(() => navigate('/'), 3000); // Redireciona para login após 3s
      } else {
        setError(data.error || "Falha ao redefinir a senha. O token pode ser inválido ou ter expirado.");
        toast({ title: "Erro", description: data.error || "Falha ao redefinir a senha.", variant: "destructive" });
      }
    } catch (err) {
      console.error("Reset password API error:", err);
      setError("Erro de conexão. Tente novamente mais tarde.");
      toast({ title: "Erro de Conexão", description: "Não foi possível conectar ao servidor.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
      {/* <ThemeToggle /> Se o ThemeToggle global não estiver visível aqui ou se preferir um local */}
      <Card className="w-full max-w-md shadow-xl bg-card border-border rounded-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-primary">Redefinir Senha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && <p className="text-center text-destructive bg-destructive/10 p-3 rounded-md">{error}</p>}
          {message && <p className="text-center text-green-600 dark:text-green-500 bg-green-500/10 p-3 rounded-md">{message}</p>}

          {!message && token && ( // Só mostra o formulário se não houver mensagem de sucesso e houver token
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <Label htmlFor="password">Nova Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite sua nova senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-input border-border text-foreground placeholder:text-muted-foreground"
                  required
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirme sua nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 bg-input border-border text-foreground placeholder:text-muted-foreground"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isLoading || !token}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                    Redefinindo...
                  </div>
                ) : (
                  "Redefinir Senha"
                )}
              </Button>
            </form>
          )}
           {!token && !error && (
             <div className="text-center text-muted-foreground">
                Carregando informações do token... Se esta mensagem persistir, o token pode ser inválido.
             </div>
           )}
          <div className="text-center mt-4">
            <Button variant="link" onClick={() => navigate('/')} className="text-primary">
              Voltar para Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;
