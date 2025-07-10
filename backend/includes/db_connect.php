<?php
// backend/includes/db_connect.php

// Inclui o arquivo de configuração uma única vez.
// __DIR__ garante que o caminho é relativo ao diretório atual do script (includes).
require_once __DIR__ . '/../config/config.php';

/**
 * Estabelece uma conexão com o banco de dados usando PDO.
 *
 * @return PDO|null Retorna um objeto PDO em caso de sucesso, ou null em caso de falha.
 */
function getPDOConnection(): ?PDO {
    static $pdo = null; // Conexão estática para reutilização (Singleton pattern simples)

    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Lança exceções em erros
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Retorna arrays associativos por padrão
            PDO::ATTR_EMULATE_PREPARES   => false,                  // Desabilita emulação de prepared statements para segurança
        ];

        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            // Em um ambiente de produção, você não deveria exibir $e->getMessage() diretamente.
            // Em vez disso, logue o erro e mostre uma mensagem genérica.
            error_log("Erro de Conexão com DB: " . $e->getMessage()); // Loga o erro
            // Para a API, pode-se retornar uma resposta JSON de erro aqui ou deixar o chamador tratar.
            // Se este script for incluído no início de cada API endpoint, uma falha aqui é crítica.
            // Retornar null e deixar o endpoint tratar pode ser uma opção.
            // Ou, lançar uma exceção personalizada que a API possa capturar.
            // Por simplicidade, vamos retornar null por enquanto.
            // Em um cenário real, um tratamento de erro mais robusto seria necessário.
            // Ex: http_response_code(500); echo json_encode(['error' => 'Database connection failed']); exit;
            return null;
        }
    }
    return $pdo;
}

// Exemplo de como obter a conexão (os scripts da API farão isso)
// $pdo = getPDOConnection();
// if (!$pdo) {
//    // Tratar falha na conexão
//    // Por exemplo, enviar uma resposta de erro 500 e sair.
// }
?>
