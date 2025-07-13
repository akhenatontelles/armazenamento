<?php
// backend/api/auth/check_session.php
require_once __DIR__ . '/../../includes/functions.php';

// Inicia a sessão de forma segura e consistente
secure_session_start();

if (is_user_logged_in()) {
    // A sessão é válida, envia os dados do usuário que estão na sessão.
    json_response(200, [
        'isLoggedIn' => true,
        'user' => [
            'id' => $_SESSION['user_id'],
            'username' => $_SESSION['username'],
            'role' => $_SESSION['role']
        ]
    ]);
} else {
    // Nenhuma sessão válida encontrada.
    json_response(401, ['isLoggedIn' => false, 'error' => 'Nenhuma sessão ativa.']);
}
?>
