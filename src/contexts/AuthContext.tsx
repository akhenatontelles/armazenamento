import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchApi } from '@/config'; // Ajuste o caminho se necessário

interface User {
  id: number;
  username: string;
  email?: string; // Email pode não ser sempre retornado ou necessário
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (userData: User) => void;
  logout: () => Promise<void>; // Tornar logout assíncrono para chamada da API
  checkLoginStatus: () => Promise<void>; // Para verificar a sessão ao carregar
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Começa como true para verificar sessão

  const login = (userData: User) => {
    setUser(userData);
    // Opcional: salvar algo no localStorage para persistir "lembrete" de login,
    // mas a sessão PHP é a fonte da verdade.
    // localStorage.setItem('isLoggedIn', 'true'); // Exemplo simples, mas a sessão é o principal.
  };

  const logout = async () => {
    try {
      await fetchApi('/auth/logout.php', { method: 'POST' });
    } catch (error) {
      console.error("Erro ao fazer logout na API:", error);
      // Mesmo se a API falhar, limpa o estado do frontend
    } finally {
      setUser(null);
      // localStorage.removeItem('isLoggedIn');
      // Idealmente, o frontend deve ser redirecionado para o login aqui se estiver em uma página protegida.
      // Isso pode ser tratado pelo componente de rota protegida.
    }
  };

  const checkLoginStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetchApi('/auth/check_session.php');
      if (response.ok) {
        const data = await response.json();
        if (data.isLoggedIn && data.user) {
          login(data.user);
        } else {
          setUser(null); // Garante que o usuário seja nulo se não estiver logado
        }
      } else {
        setUser(null); // Trata respostas não-OK como não logado
      }
    } catch (error) {
      console.error("Erro ao verificar status da sessão:", error);
      setUser(null); // Em caso de erro de rede, assume não logado
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar status do login ao montar o provider
  useEffect(() => {
    checkLoginStatus();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, checkLoginStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
