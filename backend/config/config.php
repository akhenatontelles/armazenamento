<?php
// backend/config/config.php

// Configurações do Banco de Dados
define('DB_HOST', 'localhost'); // Ou o host do seu DB
define('DB_USER', 'root');      // Seu usuário do DB
define('DB_PASS', '');          // Sua senha do DB
define('DB_NAME', 'armarzenamento'); // Nome do banco de dados que você criará com database_schema.sql

// Configurações da Aplicação
define('APP_URL', 'http://localhost:5173'); // URL base do seu frontend React (para links de email, etc.)
define('API_BASE_URL', '/backend/api');    // URL base para a API

// Configurações de Upload
define('MAX_UPLOAD_SIZE_BYTES', 50 * 1024 * 1024); // 50 MB
define('ALLOWED_MIME_TYPES', [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-powerpoint', // .ppt
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'text/plain',
    'application/zip',
    'application/x-rar-compressed',
    // Adicione outros tipos MIME conforme necessário
]);
// Caminho absoluto para o diretório base de uploads no servidor.
// IMPORTANTE: Certifique-se que este diretório exista e tenha permissões de escrita para o servidor web.
// E que NÃO seja diretamente acessível via URL se os arquivos forem servidos via script PHP.
// Exemplo para um ambiente de desenvolvimento local:
// Se a pasta 'backend' está na raiz do seu servidor web (ex: htdocs/file-nest-vault/backend),
// então o caminho absoluto seria algo como:
// $_SERVER['DOCUMENT_ROOT'] . '/file-nest-vault/backend/uploads'
// É mais seguro definir um caminho absoluto explícito.
define('BASE_UPLOAD_PATH', __DIR__ . '/../uploads'); // __DIR__ refere-se ao diretório do config.php (backend/config)

// Configurações de Sessão
define('SESSION_NAME', 'FileNestVaultSession');
define('SESSION_TIMEOUT_SECONDS', 3600); // 1 hora

// Outras constantes
define('PASSWORD_RESET_TOKEN_EXPIRY_HOURS', 1); // Token de reset de senha expira em 1 hora

// Configurações de Erro (para desenvolvimento)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Definir o timezone padrão, se necessário
date_default_timezone_set('UTC');

// Headers de Segurança (básicos) - Adicionar mais conforme necessário
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';"); // Ajuste 'unsafe-inline' se possível
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("X-XSS-Protection: 1; mode=block");
header("Referrer-Policy: strict-origin-when-cross-origin");
// Para HSTS (Strict-Transport-Security): Descomente a linha abaixo APENAS se seu site estiver configurado para rodar EXCLUSIVAMENTE sobre HTTPS.
// header("Strict-Transport-Security: max-age=31536000; includeSubDomains; preload");


// Permitir requisições de origens específicas (CORS) - Ajuste para seu frontend
// Se o frontend e backend estiverem em domínios/portas diferentes
if (isset($_SERVER['HTTP_ORIGIN'])) {
    $allowed_origins = [APP_URL]; // Adicione outras origens se necessário
    if (in_array($_SERVER['HTTP_ORIGIN'], $allowed_origins)) {
        header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Max-Age: 86400');    // cache por 1 dia
    }
}

// Lidar com requisições OPTIONS (pre-flight) para CORS
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'])) {
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    }
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
    }
    exit(0);
}

// Define o content type padrão para JSON para as APIs, a menos que seja sobrescrito
// Os scripts de API individuais podem querer definir isso eles mesmos se não for sempre JSON
// header('Content-Type: application/json'); // Movido para functions.php para ser mais granular
?>
