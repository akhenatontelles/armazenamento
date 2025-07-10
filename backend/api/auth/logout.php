<?php
// backend/api/auth/logout.php
require_once __DIR__ . '/../../includes/functions.php';

secure_session_start();

// Limpar todas as variáveis da sessão
$_SESSION = array();

// Se é desejável destruir o cookie da sessão também, note:
// Isso destruirá a sessão e não apenas os dados da sessão!
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// Finalmente, destruir a sessão.
session_destroy();

// Mesmo que não haja conteúdo, é uma boa prática enviar uma resposta JSON
// para consistência da API, ou um 204 No Content.
// Um 200 OK com uma mensagem é geralmente bom para o frontend.
json_response(200, ['message' => 'Logout realizado com sucesso.']);

?>
