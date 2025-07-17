<?php
// backend/api/users/toggle_status.php
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../includes/functions.php';
require_once __DIR__ . '/../../includes/db_connect.php';

secure_session_start();

if (!is_user_logged_in()) {
    json_response(401, ['error' => 'Acesso não autorizado.']);
}

$user_role = $_SESSION['role'] ?? null;
if ($user_role !== 'admin') {
    json_response(403, ['error' => 'Apenas administradores podem alterar o status de usuários.']);
}

$input = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($input)) {
    json_response(400, ['error' => 'JSON inválido ou malformado.']);
}

$user_id = $input['id'] ?? null;
if (!$user_id || !is_numeric($user_id)) {
    json_response(400, ['error' => 'ID de usuário inválido.']);
}

$pdo = getPDOConnection();
if (!$pdo) {
    json_response(500, ['error' => 'Falha na conexão com o banco de dados.']);
}

try {
    // Não permitir que o admin bloqueie a si mesmo
    if ((string)$user_id === (string)($_SESSION['user_id'] ?? '')) {
        json_response(400, ['error' => 'Você não pode bloquear/desbloquear seu próprio usuário.']);
    }
    // Buscar status atual
    $stmt = $pdo->prepare('SELECT is_active FROM users WHERE id = :id');
    $stmt->execute([':id' => $user_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        json_response(404, ['error' => 'Usuário não encontrado.']);
    }
    $new_status = $user['is_active'] ? 0 : 1;
    $stmt = $pdo->prepare('UPDATE users SET is_active = :is_active WHERE id = :id');
    $stmt->execute([':is_active' => $new_status, ':id' => $user_id]);
    json_response(200, ['message' => $new_status ? 'Usuário desbloqueado.' : 'Usuário bloqueado.', 'isActive' => (bool)$new_status]);
} catch (PDOException $e) {
    error_log('Erro de PDO em toggle_status.php: ' . $e->getMessage());
    json_response(500, ['error' => 'Erro de banco de dados ao alterar status.']);
}
