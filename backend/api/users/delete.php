<?php
// backend/api/users/delete.php
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../includes/functions.php';
require_once __DIR__ . '/../../includes/db_connect.php';

secure_session_start();

if (!is_user_logged_in()) {
    json_response(401, ['error' => 'Acesso não autorizado.']);
}

$user_role = $_SESSION['role'] ?? null;
if ($user_role !== 'admin') {
    json_response(403, ['error' => 'Apenas administradores podem excluir usuários.']);
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
    // Não permitir que o admin exclua a si mesmo
    if ((string)$user_id === (string)($_SESSION['user_id'] ?? '')) {
        json_response(400, ['error' => 'Você não pode excluir seu próprio usuário.']);
    }
    $stmt = $pdo->prepare('DELETE FROM users WHERE id = :id');
    $stmt->execute([':id' => $user_id]);
    if ($stmt->rowCount() > 0) {
        json_response(200, ['message' => 'Usuário excluído com sucesso.']);
    } else {
        json_response(404, ['error' => 'Usuário não encontrado.']);
    }
} catch (PDOException $e) {
    error_log('Erro de PDO em delete.php: ' . $e->getMessage());
    json_response(500, ['error' => 'Erro de banco de dados ao excluir usuário.']);
}
