<?php
error_reporting(E_ALL);
ini_set('display_errors', 1); // Tenta mostrar erros na tela
ini_set('log_errors', 1);     // Garante que os erros sejam logados
// Tenta definir um arquivo de log local, caso o global não esteja funcionando ou seja difícil de achar
ini_set('error_log', __DIR__ . '/php_debug.log'); 

echo "Iniciando test_error.php...<br>";

// Teste de conexão com o banco de dados (usando as constantes do seu config.php)
require_once __DIR__ . '/config/config.php';
echo "Constantes do DB_HOST: " . DB_HOST . ", DB_NAME: " . DB_NAME . ", DB_USER: " . DB_USER . "<br>";

try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    $pdo_test = new PDO($dsn, DB_USER, DB_PASS, $options);
    echo "SUCESSO: Conexão PDO com o banco de dados bem-sucedida! (test_error.php)<br>";
} catch (PDOException $e) {
    echo "FALHA NA CONEXÃO PDO: " . $e->getMessage() . "<br>";
    // Também loga o erro para o arquivo de log definido
    error_log("Erro de conexão PDO em test_error.php: " . $e->getMessage());
}

echo "<br>Forçando um erro de teste agora...<br>";
trigger_error("Este é um erro de teste do test_error.php para verificar o logging.", E_USER_ERROR);
echo "Script de teste concluído (você não deveria ver isso se trigger_error E_USER_ERROR funcionou como fatal).";
?>