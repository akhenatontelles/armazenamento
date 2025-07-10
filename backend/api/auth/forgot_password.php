<?php
// backend/api/auth/forgot_password.php
require_once __DIR__ . '/../../includes/functions.php';
require_once __DIR__ . '/../../includes/db_connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, ['error' => 'Método não permitido. Use POST.']);
}

$input = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($input)) {
    json_response(400, ['error' => 'JSON inválido ou malformado.']);
}

$email = $input['email'] ?? '';

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(400, ['error' => 'Formato de email inválido ou email não fornecido.']);
}

$pdo = getPDOConnection();
if (!$pdo) {
    json_response(500, ['error' => 'Falha na conexão com o banco de dados.']);
}

try {
    $stmt = $pdo->prepare("SELECT id, username FROM users WHERE email = :email");
    $stmt->bindParam(':email', $email, PDO::PARAM_STR);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        $user_id = $user['id'];
        $token = bin2hex(random_bytes(32)); // Token seguro
        $expires_at_timestamp = time() + (PASSWORD_RESET_TOKEN_EXPIRY_HOURS * 3600);
        $expires_at_formatted = date('Y-m-d H:i:s', $expires_at_timestamp);

        // Armazenar o token no banco de dados
        // Considerar invalidar tokens anteriores para o mesmo usuário
        $delete_old_stmt = $pdo->prepare("DELETE FROM password_resets WHERE user_id = :user_id");
        $delete_old_stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $delete_old_stmt->execute();

        $insert_stmt = $pdo->prepare("INSERT INTO password_resets (user_id, token, expires_at) VALUES (:user_id, :token, :expires_at)");
        $insert_stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $insert_stmt->bindParam(':token', $token, PDO::PARAM_STR);
        $insert_stmt->bindParam(':expires_at', $expires_at_formatted, PDO::PARAM_STR);

        if ($insert_stmt->execute()) {
            // **SIMULAÇÃO DE ENVIO DE EMAIL**
            // Em um aplicativo real, você enviaria um email para $email
            // contendo um link como: APP_URL . '/reset-password?token=' . $token
            $reset_link = APP_URL . '/reset-password?token=' . $token; // APP_URL de config.php

            // Para depuração, podemos logar o link ou retorná-lo (NÃO FAÇA ISSO EM PRODUÇÃO)
            error_log("Link de redefinição de senha para " . $email . " (user_id: " . $user_id . "): " . $reset_link);

            json_response(200, ['message' => 'Se o email estiver cadastrado, um link para redefinição de senha foi enviado.']);
        } else {
            error_log("Falha ao inserir token de reset para user_id: " . $user_id);
            json_response(500, ['error' => 'Erro ao processar solicitação de redefinição de senha.']);
        }
    } else {
        // Email não encontrado, mas retornamos a mesma mensagem para não revelar se um email existe ou não
        json_response(200, ['message' => 'Se o email estiver cadastrado, um link para redefinição de senha foi enviado.']);
    }

} catch (PDOException $e) {
    error_log("Erro de PDO em forgot_password.php: " . $e->getMessage());
    json_response(500, ['error' => 'Erro de banco de dados.']);
} catch (Exception $e) { // Captura random_bytes exception se houver
    error_log("Erro geral em forgot_password.php: " . $e->getMessage());
    json_response(500, ['error' => 'Erro ao gerar token seguro.']);
}
?>
