<?php
// backend/includes/functions.php

// Inclui o arquivo de configuração, pois algumas funções podem depender dele (ex: SESSION_NAME)
require_once __DIR__ . '/../config/config.php';

/**
 * Inicia ou resume uma sessão de forma segura.
 */
function secure_session_start(): void {
    if (session_status() === PHP_SESSION_NONE) {
        // Configurações de segurança para a sessão
        ini_set('session.use_only_cookies', 1); // Força o uso de cookies para a sessão
        ini_set('session.use_strict_mode', 1);  // Garante que o servidor só aceite IDs de sessão válidos gerados pelo servidor

        // Configurações de cookie da sessão
        $cookieParams = [
            'lifetime' => SESSION_TIMEOUT_SECONDS, // Tempo de vida do cookie da sessão
            'path'     => '/',                     // Caminho onde o cookie estará disponível
            'domain'   => '',                      // Domínio (vazio para o domínio atual) - ajuste se frontend e backend estiverem em subdomínios diferentes
            'secure'   => isset($_SERVER['HTTPS']), // Enviar cookie apenas sobre HTTPS (ajuste para false em desenvolvimento local HTTP)
            'httponly' => true,                     // Cookie acessível apenas via HTTP, não por JavaScript
            'samesite' => 'Lax'                     // Proteção CSRF (Lax ou Strict)
        ];
        session_set_cookie_params($cookieParams);

        session_name(SESSION_NAME); // Define um nome customizado para a sessão
        session_start();

        // Regenera o ID da sessão periodicamente para maior segurança (ex: a cada 30 minutos)
        // Ou após mudanças de privilégio (login, logout)
        if (!isset($_SESSION['session_created_at'])) {
            $_SESSION['session_created_at'] = time();
        } elseif (time() - $_SESSION['session_created_at'] > 1800) { // 30 minutos
            session_regenerate_id(true); // Regenera ID e remove o antigo
            $_SESSION['session_created_at'] = time();
        }
    }
}

/**
 * Envia uma resposta JSON padronizada.
 *
 * @param int $statusCode Código de status HTTP.
 * @param array $data Dados a serem enviados no corpo JSON.
 */
function json_response(int $statusCode, array $data): void {
    // Função recursiva para aplicar htmlspecialchars a todas as strings nos dados
    array_walk_recursive($data, function (&$item) {
        if (is_string($item)) {
            $item = htmlspecialchars($item, ENT_QUOTES, 'UTF-8');
        }
    });

    header_remove('Set-Cookie');
    header('Content-Type: application/json; charset=utf-8');
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

/**
 * Verifica se o usuário está logado.
 * Opcionalmente redireciona para a página de login se não estiver logado.
 *
 * @param string|null $redirect_url Se fornecido, redireciona para esta URL se não estiver logado.
 * @return bool True se logado, false caso contrário (se $redirect_url for null).
 */
function is_user_logged_in(?string $redirect_url = null): bool {
    secure_session_start(); // Garante que a sessão está iniciada
    if (isset($_SESSION['user_id'])) {
        // Opcional: verificar se a sessão não expirou com base em um timestamp de atividade
        if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity']) > SESSION_TIMEOUT_SECONDS) {
            session_unset();     // Limpa as variáveis da sessão
            session_destroy();   // Destrói a sessão
            if ($redirect_url) {
                json_response(401, ['error' => 'Session expired. Please login again.']);
                // header('Location: ' . $redirect_url); exit; // Para redirecionamento tradicional, não API
            }
            return false;
        }
        $_SESSION['last_activity'] = time(); // Atualiza o timestamp da última atividade
        return true;
    } else {
        if ($redirect_url) {
            json_response(401, ['error' => 'Unauthorized. Please login.']);
            // header('Location: ' . $redirect_url); exit; // Para redirecionamento tradicional, não API
        }
        return false;
    }
}

/**
 * Retorna o ID do usuário logado.
 *
 * @return int|null ID do usuário ou null se não estiver logado.
 */
function get_logged_in_user_id(): ?int {
    secure_session_start();
    return $_SESSION['user_id'] ?? null;
}

/**
 * Gera um UUID v4.
 *
 * @return string O UUID gerado.
 * @throws Exception Se não for possível gerar bytes aleatórios seguros.
 */
function generate_uuid_v4(): string {
    // Código de https://www.php.net/manual/en/function.uniqid.php#94959
    // e adaptado para UUID v4
    $data = random_bytes(16);
    assert(strlen($data) == 16);

    // Set version to 0100
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    // Set bits 6-7 to 10
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);

    // Output the 36 character UUID.
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

/**
 * Sanitiza uma string para ser usada como nome de arquivo/pasta no sistema de arquivos.
 * Remove caracteres potencialmente perigosos ou problemáticos.
 *
 * @param string $filename
 * @return string Sanitized filename
 */
function sanitize_filename(string $filename): string {
    // Remove caracteres ilegais comuns em nomes de arquivo/caminho
    $filename = preg_replace('/[\x00-\x1F\x7F<>:"\/\\|?*]/', '', $filename);
    // Remove pontos no início ou fim do nome (problemas em alguns FS)
    $filename = trim($filename, '.');
    // Limita o comprimento
    $filename = substr($filename, 0, 200); // Limite razoável
    // Se o nome do arquivo ficar vazio após a sanitização, retorna um nome padrão
    if (empty($filename)) {
        return 'sanitized_filename_' . time();
    }
    return $filename;
}

?>
