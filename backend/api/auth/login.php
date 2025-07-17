<?php
// backend/api/auth/login.php
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../includes/functions.php';
require_once __DIR__ . '/../../includes/db_connect.php';

secure_session_start();

// Garanta CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, ['error' => 'Método não permitido. Use POST.']);
}

$input = json_decode(file_get_contents('php://input'), true);

if (json_last_error() !== JSON_ERROR_NONE || !is_array($input)) {
    json_response(400, ['error' => 'JSON inválido ou malformado.']);
}

$identifier = $input['identifier'] ?? '';
$password = $input['password'] ?? '';

if (empty($identifier) || empty($password)) {
    json_response(400, ['error' => 'Identificador (nome de usuário ou email) e senha são obrigatórios.']);
}

$pdo = getPDOConnection();

if (!$pdo instanceof PDO) { 
    error_log("Erro crítico em login.php: getPDOConnection() não retornou um objeto PDO válido.");
    json_response(500, ['error' => 'Falha crítica na conexão com o banco de dados.']);
}

try {
    $stmt = $pdo->prepare("SELECT id, username, email, password_hash, role FROM users WHERE username = :username_identifier OR email = :email_identifier");
    $stmt->execute([
        ':username_identifier' => $identifier,
        ':email_identifier' => $identifier
    ]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user && password_verify($password, $user['password_hash'])) {
        session_regenerate_id(true);
        $_SESSION['user_id'] = (int)$user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['last_activity'] = time();
        $_SESSION['session_created_at'] = time();

        json_response(200, [
            'message' => 'Login bem-sucedido.',
            'user' => [
                'id' => (int)$user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'role' => $user['role']
            ]
        ]);
    } else {
        json_response(401, ['error' => 'Credenciais inválidas.']);
    }

} catch (PDOException $e) {
    error_log("Erro de PDO em login.php: " . $e->getMessage() . "\nStack trace: " . $e->getTraceAsString());
    json_response(500, ['error' => 'Erro de banco de dados durante o login.']); 
}
?>