<?php
// backend/api/users/list.php
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../includes/functions.php';
require_once __DIR__ . '/../../includes/db_connect.php';

secure_session_start();

if (!is_user_logged_in()) {
    json_response(401, ['error' => 'Acesso não autorizado.']);
}

$user_role = $_SESSION['role'] ?? null;
if ($user_role !== 'admin') {
    json_response(403, ['error' => 'Apenas administradores podem listar usuários.']);
}

$pdo = getPDOConnection();
if (!$pdo) {
    json_response(500, ['error' => 'Falha na conexão com o banco de dados.']);
}

try {
    $stmt = $pdo->query('SELECT id, username, email, role, created_at, updated_at, 1 as isActive FROM users');
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    // Adapta os campos para o frontend
    foreach ($users as &$user) {
        $user['id'] = (string)$user['id'];
        $user['isActive'] = true; // TODO: implementar campo real de status se necessário
        $user['createdAt'] = $user['created_at'];
        $user['lastLogin'] = $user['updated_at']; // Ajuste se houver campo real de last_login
        unset($user['created_at'], $user['updated_at']);
    }
    json_response(200, ['users' => $users]);
} catch (PDOException $e) {
    error_log('Erro ao listar usuários: ' . $e->getMessage());
    json_response(500, ['error' => 'Erro ao listar usuários.']);
}
