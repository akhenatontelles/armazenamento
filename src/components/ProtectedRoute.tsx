import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: Array<'user' | 'admin'>;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // Exibir spinner enquanto verifica autenticação (evita "piscadas")
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    // Usuário não logado, redireciona para a página de login
    // Passa a localização atual para que possa ser redirecionado de volta após o login
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Usuário logado, mas não tem a role permitida para esta rota
    // Redireciona para uma página "Não Autorizado" ou para o dashboard padrão do usuário
    // Por simplicidade, redirecionaremos para o dashboard apropriado ou raiz se o dashboard não for acessível
    // Apenas redireciona para o dashboard apropriado, sem toast
    return <Navigate to={user.role === 'admin' ? "/admin" : "/dashboard"} replace />;
    // Ou para uma página específica /unauthorized: return <Navigate to="/unauthorized" replace />;
  }

  // Usuário logado e tem a role permitida (ou nenhuma role específica é necessária)
  return <Outlet />; // Renderiza o componente filho (a rota protegida)
};

// Hook de toast não está disponível aqui diretamente, teria que ser passado ou usar um global.
// Para o erro de "Acesso Negado", um toast global ou um componente de notificação seria melhor.
// Por simplicidade, vou remover o toast daqui e o redirecionamento será a principal indicação.
// O toast pode ser adicionado no componente da página de destino se necessário.

const ProtectedRouteWithoutToast: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
     // console.warn(`Acesso negado para ${user.username} (role: ${user.role}) à rota que requer ${allowedRoles.join(', ')}`);
    // Redirecionar para o dashboard apropriado baseado na role do usuário
    const dashboardPath = user.role === 'admin' ? '/admin' : '/dashboard';
    // Se o usuário já está no seu dashboard e tenta acessar outra rota protegida indevidamente,
    // pode-se redirecionar para '/' ou uma página de erro 'Não Autorizado'.
    // Se a rota atual já é o dashboard dele, não redireciona para evitar loop.
    if (location.pathname === dashboardPath) {
        // Se já está no dashboard correto e tenta acessar algo que não deve,
        // talvez redirecionar para a raiz ou uma página de erro específica.
        // Por agora, se ele já está no dashboard dele, e a rota não é permitida,
        // é uma situação estranha. Redirecionar para a raiz como fallback.
        return <Navigate to="/" replace />;
    }
    return <Navigate to={dashboardPath} replace />;
  }

  return <Outlet />;
};


export default ProtectedRouteWithoutToast; // Exportando a versão sem toast por simplicidade aqui
// Para usar o toast, ele precisaria ser injetado ou o AuthProvider precisaria expor uma função de toast.
// Ou usar um sistema de toast global acessível em qualquer lugar.
// A biblioteca `sonner` (se for a usada pelo `useToast`) pode ser importada e usada diretamente aqui.
// import { toast as sonnerToast } from "sonner"; // Se `sonner` estiver configurado globalmente.
// Exemplo: sonnerToast.error("Acesso Negado", { description: "Você não tem permissão..." });

// Para o propósito deste exercício, o redirecionamento é o feedback principal.
// A mensagem de "Acesso Negado" pode ser mostrada na página para a qual o usuário é redirecionado, se aplicável.
