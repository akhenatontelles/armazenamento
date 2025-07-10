<?php
// backend/api/auth/check_session.php
require_once __DIR__ . '/../../includes/functions.php';
require_once __DIR__ . '/../../includes/db_connect.php'; // Para buscar dados atualizados do usuário se necessário

// secure_session_start() é chamado por is_user_logged_in() e get_logged_in_user_id()

if (is_user_logged_in()) {
    $user_id = get_logged_in_user_id();

    // Opcional: Buscar dados frescos do usuário do DB em vez de confiar apenas na sessão
    // Isso pode ser útil se os dados do usuário (ex: role) puderem mudar durante uma sessão ativa.
    // Por simplicidade, podemos retornar o que já está na sessão, assumindo que é suficiente.
    // Se precisar de dados frescos:
    /*
    $pdo = getPDOConnection();
    if (!$pdo) {
        json_response(500, ['error' => 'Falha na conexão com o banco de dados ao verificar sessão.']);
    }
    try {
        $stmt = $pdo->prepare("SELECT id, username, email, role FROM users WHERE id = :user_id");
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            // Atualizar dados da sessão se necessário (ex: se role mudou)
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];

            json_response(200, [
                'isLoggedIn' => true,
                'user' => [
                    'id' => (int)$user['id'],
                    'username' => $user['username'],
                    'email' => $user['email'], // Cuidado ao expor email aqui, se não for necessário
                    'role' => $user['role']
                ]
            ]);
        } else {
            // Usuário da sessão não encontrado no DB - algo está errado, invalidar sessão
            session_unset();
            session_destroy();
            json_response(401, ['isLoggedIn' => false, 'error' => 'Usuário da sessão inválido.']);
        }
    } catch (PDOException $e) {
        error_log("Erro de PDO em check_session.php: " . $e->getMessage());
        json_response(500, ['error' => 'Erro de banco de dados ao verificar sessão.']);
    }
    */

    // Versão simples que confia nos dados da sessão:
    json_response(200, [
        'isLoggedIn' => true,
        'user' => [
            'id' => $_SESSION['user_id'],
            'username' => $_SESSION['username'],
            'role' => $_SESSION['role']
            // Não inclua email aqui a menos que seja necessário e você esteja ciente das implicações de privacidade
        ]
    ]);

} else {
    json_response(401, ['isLoggedIn' => false, 'error' => 'Nenhuma sessão ativa.']);
}
?>
