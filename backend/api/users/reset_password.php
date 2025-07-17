<?php
// backend/api/users/reset_password.php
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../includes/functions.php';
require_once __DIR__ . '/../../includes/db_connect.php';

secure_session_start();

if (!is_user_logged_in()) {
    json_response(401, ['error' => 'Acesso não autorizado.']);
}

$user_role = $_SESSION['role'] ?? null;
if ($user_role !== 'admin') {
    json_response(403, ['error' => 'Apenas administradores podem resetar senhas de usuários.']);
}

$input = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($input)) {
    json_response(400, ['error' => 'JSON inválido ou malformado.']);
}

$user_id = $input['id'] ?? null;
$new_password = $input['newPassword'] ?? '';
if (!$user_id || !is_numeric($user_id) || strlen($new_password) < 6) {
    json_response(400, ['error' => 'ID de usuário inválido ou nova senha muito curta.']);
}

$pdo = getPDOConnection();
if (!$pdo) {
    json_response(500, ['error' => 'Falha na conexão com o banco de dados.']);
}

try {
    // Não permitir que o admin resete a própria senha por aqui
    if ((string)$user_id === (string)($_SESSION['user_id'] ?? '')) {
        json_response(400, ['error' => 'Use a tela de perfil para alterar sua própria senha.']);
    }
    $password_hash = password_hash($new_password, PASSWORD_DEFAULT);
    if ($password_hash === false) {
        error_log('Falha ao gerar hash da nova senha para o usuário ID: ' . $user_id);
        json_response(500, ['error' => 'Erro interno ao processar senha.']);
    }
    $stmt = $pdo->prepare('UPDATE users SET password_hash = :password_hash WHERE id = :id');
    $stmt->execute([':password_hash' => $password_hash, ':id' => $user_id]);
    if ($stmt->rowCount() > 0) {
        json_response(200, ['message' => 'Senha redefinida com sucesso.']);
    } else {
        json_response(404, ['error' => 'Usuário não encontrado.']);
    }
} catch (PDOException $e) {
    error_log('Erro de PDO em reset_password.php: ' . $e->getMessage());
    json_response(500, ['error' => 'Erro de banco de dados ao redefinir senha.']);
}
