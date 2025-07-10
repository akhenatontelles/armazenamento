<?php
// backend/api/auth/register.php
require_once __DIR__ . '/../../includes/functions.php';
require_once __DIR__ . '/../../includes/db_connect.php';

secure_session_start(); // Iniciar sessão segura

// Permitir apenas método POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, ['error' => 'Método não permitido. Use POST.']);
}

// Obter dados JSON do corpo da requisição
$input = json_decode(file_get_contents('php://input'), true);

if (json_last_error() !== JSON_ERROR_NONE || !is_array($input)) {
    json_response(400, ['error' => 'JSON inválido ou malformado.']);
}

// Validar dados de entrada
$username = $input['username'] ?? '';
$email = $input['email'] ?? '';
$password = $input['password'] ?? '';

if (empty($username) || empty($email) || empty($password)) {
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

if (strlen($password) < 6) { // Requisito de senha mais forte seria ideal
    json_response(400, ['error' => 'Senha deve ter pelo menos 6 caracteres.']);
}
if (strlen($password) > 255) { // Limite para o hash
    json_response(400, ['error' => 'Senha muito longa.']);
}


$pdo = getPDOConnection();
if (!$pdo) {
    json_response(500, ['error' => 'Falha na conexão com o banco de dados.']);
}

try {
    // Verificar se username já existe
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = :username");
    $stmt->bindParam(':username', $username, PDO::PARAM_STR);
    $stmt->execute();
    if ($stmt->fetch()) {
        json_response(409, ['error' => 'Nome de usuário já está em uso.']); // 409 Conflict
    }

    // Verificar se email já existe
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = :email");
    $stmt->bindParam(':email', $email, PDO::PARAM_STR);
    $stmt->execute();
    if ($stmt->fetch()) {
        json_response(409, ['error' => 'Email já está em uso.']);
    }

    // Hashear a senha
    $password_hash = password_hash($password, PASSWORD_DEFAULT);
    if ($password_hash === false) {
        // Logar o erro real de password_hash
        error_log("Falha ao gerar hash da senha para o usuário: " . $username);
        json_response(500, ['error' => 'Erro interno ao processar senha.']);
    }

    // Inserir novo usuário
    // Por padrão, a role será 'user' conforme definido no schema do DB
    $stmt = $pdo->prepare("INSERT INTO users (username, email, password_hash) VALUES (:username, :email, :password_hash)");
    $stmt->bindParam(':username', $username, PDO::PARAM_STR);
    $stmt->bindParam(':email', $email, PDO::PARAM_STR);
    $stmt->bindParam(':password_hash', $password_hash, PDO::PARAM_STR);

    if ($stmt->execute()) {
        $user_id = $pdo->lastInsertId();
        // Opcional: Logar o usuário automaticamente após o registro
        $_SESSION['user_id'] = (int)$user_id;
        $_SESSION['username'] = $username;
        $_SESSION['role'] = 'user'; // Definir a role na sessão
        $_SESSION['last_activity'] = time();
        $_SESSION['session_created_at'] = time();

        json_response(201, [
            'message' => 'Usuário registrado com sucesso.',
            'user' => [
                'id' => (int)$user_id,
                'username' => $username,
                'email' => $email,
                'role' => 'user'
            ]
        ]);
    } else {
        // Logar o erro de execução do statement
        error_log("Falha ao executar statement de inserção para o usuário: " . $username . " Erro: " . implode(":", $stmt->errorInfo()));
        json_response(500, ['error' => 'Erro ao registrar usuário.']);
    }

} catch (PDOException $e) {
    // Logar o erro PDO
    error_log("Erro de PDO em register.php: " . $e->getMessage());
    json_response(500, ['error' => 'Erro de banco de dados: ' . $e->getMessage()]); // Em produção, mensagem genérica
} catch (Exception $e) {
    // Logar outros erros
    error_log("Erro geral em register.php: " . $e->getMessage());
    json_response(500, ['error' => 'Ocorreu um erro inesperado.']);
}

?>
