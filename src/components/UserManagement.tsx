import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { KeyRound } from "lucide-react";

interface User {
  id: string;
  username: string;
  email: string;
  role: "admin" | "user";
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "user" as "admin" | "user",
  });
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/armarzenamento/backend/api/users/list.php', {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        if (data.users) {
          setUsers(
            data.users.map((user: any) => ({
              ...user,
              isActive: !!user.isActive,
              createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
              lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined,
            }))
          );
        }
      })
      .catch(() => {
        toast({
          title: 'Erro',
          description: 'Erro ao buscar usuários do servidor',
          variant: 'destructive',
        });
      });
  }, []);

  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await fetch('/armarzenamento/backend/api/users/create.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUsers([...users, {
          ...data.user,
          createdAt: new Date(),
          lastLogin: undefined,
        }]);
        setNewUser({ username: "", email: "", password: "", role: "user" });
        setIsCreateUserOpen(false);
        toast({
          title: "Usuário criado!",
          description: `Usuário ${data.user.username} criado com sucesso`,
        });
      } else {
        toast({
          title: "Erro",
          description: data.error || 'Erro ao criar usuário',
          variant: 'destructive',
        });
      }
    } catch (e) {
      toast({
        title: "Erro",
        description: "Erro ao criar usuário",
        variant: "destructive",
      });
    }
  };

  const handleToggleUserStatus = async (userId: string) => {
    try {
      const res = await fetch('/armarzenamento/backend/api/users/toggle_status.php', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: userId }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(users.map(user =>
          user.id === userId ? { ...user, isActive: data.isActive } : user
        ));
        toast({
          title: data.isActive ? "Usuário desbloqueado" : "Usuário bloqueado",
          description: `Status atualizado com sucesso`,
        });
      } else {
        toast({
          title: "Erro",
          description: data.error || 'Erro ao atualizar status',
          variant: 'destructive',
        });
      }
    } catch (e) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const res = await fetch('/armarzenamento/backend/api/users/delete.php', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: userId }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
        toast({
          title: "Usuário excluído",
          description: `Usuário removido do sistema`,
        });
      } else {
        toast({
          title: "Erro",
          description: data.error || 'Erro ao excluir usuário',
          variant: 'destructive',
        });
      }
    } catch (e) {
      toast({
        title: "Erro",
        description: "Erro ao excluir usuário",
        variant: "destructive",
      });
    }
  };

  const navigateToUserPanel = (user: User) => {
    // Simular acesso como o usuário e redirecionar para o dashboard do usuário
    localStorage.setItem("userType", "user");
    localStorage.setItem("username", user.username);
    localStorage.setItem("adminViewingUser", "true"); // Flag para indicar que admin está visualizando
    
    toast({
      title: "Acessando painel do usuário",
      description: `Redirecionando para o painel de ${user.username}`,
    });
    
    navigate("/dashboard");
  };

  const handlePasswordReset = async () => {
    if (!selectedUser || !newPassword) return;
    try {
      const res = await fetch('/armarzenamento/backend/api/users/reset_password.php', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: selectedUser.id, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: "Senha alterada",
          description: `Senha de ${selectedUser.username} alterada com sucesso`,
        });
      } else {
        toast({
          title: "Erro",
          description: data.error || 'Erro ao alterar senha',
          variant: 'destructive',
        });
      }
    } catch (e) {
      toast({
        title: "Erro",
        description: "Erro ao alterar senha",
        variant: "destructive",
      });
      return;
    }
    // Toast de sucesso após alteração de senha
    toast({
      title: "Senha alterada!",
      description: `Senha de ${selectedUser.username} foi alterada com sucesso`,
    });
    setSelectedUser(null);
    setNewPassword("");
    setIsPasswordResetOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="mega-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                👥 Gerenciamento de Usuários
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {users.length} usuários cadastrados
              </p>
            </div>

            <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
              <DialogTrigger asChild>
                <Button className="mega-button-primary">
                  ➕ Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Usuário</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="username">Nome de usuário</Label>
                    <Input
                      id="username"
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      placeholder="Digite o nome de usuário"
                      className="mega-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="Digite o email"
                      className="mega-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="Digite a senha"
                      className="mega-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Tipo de usuário</Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value: "admin" | "user") => 
                        setNewUser({ ...newUser, role: value })
                      }
                    >
                      <SelectTrigger className="mega-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">👤 Usuário</SelectItem>
                        <SelectItem value="admin">👑 Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreateUser} className="mega-button-primary w-full">
                    Criar Usuário
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Buscar usuários por nome ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mega-input max-w-sm"
          />
        </CardContent>
      </Card>

      {/* Users List */}
      <div className="grid gap-4">
        {filteredUsers.length === 0 ? (
          <Card className="mega-card">
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                {searchQuery ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.id} className="mega-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{user.username}</h3>
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                          {user.role === "admin" ? "👑 Admin" : "👤 Usuário"}
                        </Badge>
                        <Badge variant={user.isActive ? "default" : "destructive"}>
                          {user.isActive ? "Ativo" : "Bloqueado"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span>Criado: {user.createdAt.toLocaleDateString()}</span>
                        {user.lastLogin && (
                          <span>Último acesso: {user.lastLogin.toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateToUserPanel(user)}
                      className="mega-button-secondary"
                    >
                      🔍 Acessar Painel
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setIsPasswordResetOpen(true);
                      }}
                      className="mega-button-secondary"
                    >
                      <KeyRound className="w-4 h-4" />
                    </Button>
                    
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active-${user.id}`} className="text-xs">
                        {user.isActive ? "Ativo" : "Bloqueado"}
                      </Label>
                      <Switch
                        id={`active-${user.id}`}
                        checked={user.isActive}
                        onCheckedChange={() => handleToggleUserStatus(user.id)}
                      />
                    </div>

                    {user.role !== "admin" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        🗑️
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Password Reset Modal */}
      <Dialog open={isPasswordResetOpen} onOpenChange={setIsPasswordResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha - {selectedUser?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="admin-new-password">Nova Senha</Label>
              <Input
                id="admin-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha"
                className="mega-input"
              />
            </div>
            <Button onClick={handlePasswordReset} className="mega-button-primary w-full">
              Alterar Senha
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;