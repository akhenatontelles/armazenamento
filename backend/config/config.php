<?php
// backend/config/config.php

// Defina APP_URL primeiro, pois é usado na lógica CORS para OPTIONS
define('APP_URL', 'https://capivaralab.com/armarzenamento'); // Mudado para HTTPS

// Lidar com requisições OPTIONS (pre-flight) para CORS PRIMEIRO
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    $http_origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : APP_URL;
    $allowed_origins_options = [APP_URL, 'https://capivaralab.com']; // Mudado para HTTPS

    if (in_array($http_origin, $allowed_origins_options)) {
        header("Access-Control-Allow-Origin: " . $http_origin);
    } else {
        header("Access-Control-Allow-Origin: " . APP_URL);
    }

    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');    // cache por 1 dia

    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'])) {
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    }
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
    }
    exit(0);
}

// Headers de Segurança (básicos)
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("X-XSS-Protection: 1; mode=block");
header("Referrer-Policy: strict-origin-when-cross-origin");

// Configurações do Banco de Dados
define('DB_HOST', 'localhost');
define('DB_USER', 'akhena46_SiteAge');
define('DB_PASS', 'DCVTPgp23c');
define('DB_NAME', 'akhena46_capivara.armarzenamento');

// Configurações da Aplicação (APP_URL já definido acima)
define('API_BASE_URL', '/armarzenamento/backend/api'); // Este é relativo ao domínio, não precisa de http/https

// Permitir requisições de origens específicas (CORS) para requisições NÃO-OPTIONS
if (isset($_SERVER['HTTP_ORIGIN'])) {
    $allowed_origins = [APP_URL, 'https://capivaralab.com']; // Mudado para HTTPS
    if (in_array($_SERVER['HTTP_ORIGIN'], $allowed_origins)) {
        header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
        header('Access-Control-Allow-Credentials: true');
    }
}

// Configurações de Upload
define('MAX_UPLOAD_SIZE_BYTES', 50 * 1024 * 1024);
define('ALLOWED_MIME_TYPES', [
    'image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'application/zip', 'application/x-rar-compressed',
]);
// __DIR__ aqui é backend/config/ , então ../uploads aponta para backend/uploads
define('BASE_UPLOAD_PATH', __DIR__ . '/../uploads');

// Configurações de Sessão
define('SESSION_NAME', 'FileNestVaultSession');
define('SESSION_TIMEOUT_SECONDS', 3600);

// Outras constantes
define('PASSWORD_RESET_TOKEN_EXPIRY_HOURS', 1);

// Configurações de Erro (para desenvolvimento)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Definir o timezone padrão
date_default_timezone_set('UTC');
?>
