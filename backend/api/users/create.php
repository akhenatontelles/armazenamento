<?php
// backend/api/users/create.php
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../includes/functions.php';
require_once __DIR__ . '/../../includes/db_connect.php';

secure_session_start();

if (!is_user_logged_in()) {
    json_response(401, ['error' => 'Acesso não autorizado.']);
}

$user_role = $_SESSION['role'] ?? null;
if ($user_role !== 'admin') {
    json_response(403, ['error' => 'Apenas administradores podem criar usuários.']);
}

$input = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($input)) {
    json_response(400, ['error' => 'JSON inválido ou malformado.']);
}

$username = trim($input['username'] ?? '');
$email = trim($input['email'] ?? '');
$password = $input['password'] ?? '';
$role = $input['role'] ?? 'user';

if ($username === '' || $email === '' || $password === '') {
    json_response(400, ['error' => 'Nome de usuário, email e senha são obrigatórios.']);
}
if (strlen($username) < 3 || strlen($username) > 50) {
    json_response(400, ['error' => 'Nome de usuário deve ter entre 3 e 50 caracteres.']);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(400, ['error' => 'Formato de email inválido.']);
}
if (strlen($email) > 100) {
    json_response(400, ['error' => 'Email não pode exceder 100 caracteres.']);
}
if (strlen($password) < 6) {
    json_response(400, ['error' => 'Senha deve ter pelo menos 6 caracteres.']);
}
if (!in_array($role, ['user', 'admin'])) {
    json_response(400, ['error' => 'Role inválida.']);
}

$pdo = getPDOConnection();
if (!$pdo) {
    json_response(500, ['error' => 'Falha na conexão com o banco de dados.']);
}

try {
    // Verificar se username já existe
    $stmt = $pdo->prepare('SELECT id FROM users WHERE username = :username');
    $stmt->execute([':username' => $username]);
    if ($stmt->fetch()) {
        json_response(409, ['error' => 'Nome de usuário já está em uso.']);
    }
    // Verificar se email já existe
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = :email');
    $stmt->execute([':email' => $email]);
    if ($stmt->fetch()) {
        json_response(409, ['error' => 'Email já está em uso.']);
    }
    // Hashear a senha
    $password_hash = password_hash($password, PASSWORD_DEFAULT);
    if ($password_hash === false) {
        error_log('Falha ao gerar hash da senha para o usuário: ' . $username);
        json_response(500, ['error' => 'Erro interno ao processar senha.']);
    }
    // Inserir novo usuário
    $stmt = $pdo->prepare('INSERT INTO users (username, email, password_hash, role) VALUES (:username, :email, :password_hash, :role)');
    if ($stmt->execute([
        ':username' => $username,
        ':email' => $email,
        ':password_hash' => $password_hash,
        ':role' => $role,
    ])) {
        $user_id = $pdo->lastInsertId();
        json_response(201, [
            'message' => 'Usuário criado com sucesso.',
            'user' => [
                'id' => (string)$user_id,
                'username' => $username,
                'email' => $email,
                'role' => $role,
                'isActive' => true,
            ]
        ]);
    } else {
        error_log('Falha ao inserir usuário: ' . $username);
        json_response(500, ['error' => 'Erro ao criar usuário.']);
    }
} catch (PDOException $e) {
    error_log('Erro de PDO em create.php: ' . $e->getMessage());
    json_response(500, ['error' => 'Erro de banco de dados ao criar usuário.']);
}
