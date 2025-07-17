<?php
// backend/includes/functions.php

require_once __DIR__ . '/../config/config.php';

function secure_session_start(): void {
    $cookieParams = [
        'lifetime' => 0,
        'path' => '/armarzenamento', // ajuste conforme sua URL base
        'domain' => 'capivaralab.com', // sem www
        'secure' => true, // true se HTTPS, false se HTTP
        'httponly' => true,
        'samesite' => 'None' // necessário para cross-site cookie em HTTPS
    ];
    session_name('FileNestVaultSession');
    if (PHP_VERSION_ID < 70300) {
        session_set_cookie_params(
            $cookieParams['lifetime'],
            $cookieParams['path'].'; samesite=None',
            $cookieParams['domain'],
            $cookieParams['secure'],
            $cookieParams['httponly']
        );
    } else {
        session_set_cookie_params($cookieParams);
    }
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
}

function json_response(int $statusCode, array $data): void {
    array_walk_recursive($data, function (&$item) {
        if (is_string($item)) {
            $item = htmlspecialchars($item, ENT_QUOTES, 'UTF-8');
        }
    });

    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code($statusCode);
    }
    echo json_encode($data);
    exit;
}

function is_user_logged_in(): bool {
    if (isset($_SESSION['user_id'])) {
        if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity']) > SESSION_TIMEOUT_SECONDS) {
            session_unset();
            session_destroy();
            return false;
        }
        $_SESSION['last_activity'] = time();
        return true;
    }
    return false;
}

function get_logged_in_user_id(): ?int {
    return $_SESSION['user_id'] ?? null;
}

function generate_uuid_v4(): string {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function sanitize_filename(string $filename): string {
    $filename = preg_replace('/[\x00-\x1F\x7F<>:"\/\\|?*]/', '', $filename);
    $filename = trim($filename, '.');
    $filename = substr($filename, 0, 200);
    if (empty($filename)) {
        return 'sanitized_filename_' . time();
    }
    return $filename;
}
?>