<?php
// backend/api/auth/logout.php
require_once __DIR__ . '/../../includes/functions.php';

// Inicia a sessão de forma segura para poder manipulá-la
secure_session_start();

// Limpar todas as variáveis da sessão
$_SESSION = array();

// Destruir o cookie de sessão no navegador, se ele existir
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// Finalmente, destruir a sessão no servidor.
session_destroy();

// Envia uma resposta JSON de sucesso
json_response(200, ['message' => 'Logout realizado com sucesso.']);
?>
