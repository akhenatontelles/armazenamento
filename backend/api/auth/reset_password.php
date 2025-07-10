<?php
// backend/api/auth/reset_password.php
require_once __DIR__ . '/../../includes/functions.php';
require_once __DIR__ . '/../../includes/db_connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, ['error' => 'Método não permitido. Use POST.']);
}

$input = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($input)) {
    json_response(400, ['error' => 'JSON inválido ou malformado.']);
}

$token = $input['token'] ?? '';
$new_password = $input['password'] ?? ''; // O frontend deve enviar 'password'

if (empty($token) || empty($new_password)) {
    json_response(400, ['error' => 'Token e nova senha são obrigatórios.']);
}

if (strlen($new_password) < 6) {
    json_response(400, ['error' => 'Nova senha deve ter pelo menos 6 caracteres.']);
}
if (strlen($new_password) > 255) {
    json_response(400, ['error' => 'Nova senha muito longa.']);
}

$pdo = getPDOConnection();
if (!$pdo) {
    json_response(500, ['error' => 'Falha na conexão com o banco de dados.']);
}

try {
    // Verificar o token e sua validade
    $stmt = $pdo->prepare("SELECT user_id, expires_at FROM password_resets WHERE token = :token");
    $stmt->bindParam(':token', $token, PDO::PARAM_STR);
    $stmt->execute();
    $reset_request = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$reset_request) {
        json_response(400, ['error' => 'Token inválido ou não encontrado.']);
    }

    // Verificar se o token expirou
    $current_time = time();
    $expires_at_timestamp = strtotime($reset_request['expires_at']);

    if ($current_time > $expires_at_timestamp) {
        // Token expirado, remover do DB
        $delete_stmt = $pdo->prepare("DELETE FROM password_resets WHERE token = :token");
        $delete_stmt->bindParam(':token', $token, PDO::PARAM_STR);
        $delete_stmt->execute();
        json_response(400, ['error' => 'Token expirado. Por favor, solicite uma nova redefinição de senha.']);
    }

    $user_id = $reset_request['user_id'];

    // Hashear a nova senha
    $new_password_hash = password_hash($new_password, PASSWORD_DEFAULT);
    if ($new_password_hash === false) {
        error_log("Falha ao gerar hash da nova senha para user_id: " . $user_id);
        json_response(500, ['error' => 'Erro interno ao processar nova senha.']);
    }

    // Atualizar a senha do usuário no banco de dados
    $update_stmt = $pdo->prepare("UPDATE users SET password_hash = :password_hash WHERE id = :user_id");
    $update_stmt->bindParam(':password_hash', $new_password_hash, PDO::PARAM_STR);
    $update_stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);

    if ($update_stmt->execute()) {
        // Senha atualizada com sucesso, remover o token da tabela password_resets
        $delete_stmt = $pdo->prepare("DELETE FROM password_resets WHERE user_id = :user_id"); // Deleta todos os tokens para este usuário
        $delete_stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $delete_stmt->execute();

        json_response(200, ['message' => 'Senha redefinida com sucesso. Você já pode fazer login com sua nova senha.']);
    } else {
        error_log("Falha ao atualizar senha para user_id: " . $user_id);
        json_response(500, ['error' => 'Erro ao redefinir senha.']);
    }

} catch (PDOException $e) {
    error_log("Erro de PDO em reset_password.php: " . $e->getMessage());
    json_response(500, ['error' => 'Erro de banco de dados.']);
} catch (Exception $e) {
    error_log("Erro geral em reset_password.php: " . $e->getMessage());
    json_response(500, ['error' => 'Ocorreu um erro inesperado.']);
}
?>
