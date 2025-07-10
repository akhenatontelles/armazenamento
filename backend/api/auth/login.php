<?php
// backend/api/auth/login.php
require_once __DIR__ . '/../../includes/functions.php';
require_once __DIR__ . '/../../includes/db_connect.php';

secure_session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, ['error' => 'Método não permitido. Use POST.']);
}

$input = json_decode(file_get_contents('php://input'), true);

if (json_last_error() !== JSON_ERROR_NONE || !is_array($input)) {
    json_response(400, ['error' => 'JSON inválido ou malformado.']);
}

$identifier = $input['identifier'] ?? ''; // Pode ser username ou email
$password = $input['password'] ?? '';

if (empty($identifier) || empty($password)) {
    json_response(400, ['error' => 'Identificador (nome de usuário ou email) e senha são obrigatórios.']);
}

$pdo = getPDOConnection();
if (!$pdo) {
    json_response(500, ['error' => 'Falha na conexão com o banco de dados.']);
}

try {
    // Tenta encontrar o usuário pelo username ou email
    $stmt = $pdo->prepare("SELECT id, username, email, password_hash, role FROM users WHERE username = :identifier OR email = :identifier");
    $stmt->bindParam(':identifier', $identifier, PDO::PARAM_STR);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user && password_verify($password, $user['password_hash'])) {
        // Senha correta, login bem-sucedido

        // Regenerar ID da sessão para prevenir fixation
        session_regenerate_id(true);

        $_SESSION['user_id'] = (int)$user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['last_activity'] = time();
        $_SESSION['session_created_at'] = time(); // Marcar tempo de criação da nova sessão/ID

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
        // Usuário não encontrado ou senha incorreta
        json_response(401, ['error' => 'Credenciais inválidas.']);
    }

} catch (PDOException $e) {
    error_log("Erro de PDO em login.php: " . $e->getMessage());
    json_response(500, ['error' => 'Erro de banco de dados.']); // Mensagem genérica em produção
} catch (Exception $e) {
    error_log("Erro geral em login.php: " . $e->getMessage());
    json_response(500, ['error' => 'Ocorreu um erro inesperado.']);
}

?>
