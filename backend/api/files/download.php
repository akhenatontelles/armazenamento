<?php
// backend/api/files/download.php
require_once __DIR__ . '/../../includes/functions.php';
require_once __DIR__ . '/../../includes/db_connect.php';

secure_session_start(); // Iniciar sessão para verificar autenticação

// Não precisa de is_user_logged_in() aqui se o acesso ao arquivo for público por ID,
// mas geralmente downloads são protegidos.
if (!is_user_logged_in()) {
    // Se o frontend tentar embutir isso em iframes/imagens, uma resposta JSON pode não ser ideal.
    // Poderia retornar um 401 HTTP puro, ou uma pequena imagem/página de erro.
    // Por enquanto, para consistência da API:
    header('Content-Type: application/json');
    http_response_code(401);
    echo json_encode(['error' => 'Acesso não autorizado. Por favor, faça login para baixar.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Content-Type: application/json');
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido. Use GET.']);
    exit;
}

$user_id = get_logged_in_user_id();
$file_id = $_GET['id'] ?? '';

if (empty($file_id)) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode(['error' => 'ID do arquivo é obrigatório.']);
    exit;
}

$pdo = getPDOConnection();
if (!$pdo) {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['error' => 'Falha na conexão com o banco de dados.']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT name, mime_type, size, server_folder_path, server_filename
                           FROM files
                           WHERE id = :id AND user_id = :user_id AND type = 'file'");
    $stmt->bindParam(':id', $file_id, PDO::PARAM_STR);
    $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->execute();
    $file_info = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$file_info) {
        header('Content-Type: application/json');
        http_response_code(404);
        echo json_encode(['error' => 'Arquivo não encontrado ou acesso negado.']);
        exit;
    }

    $user_base_upload_dir = rtrim(BASE_UPLOAD_PATH, '/') . '/' . $user_id;
    $full_disk_path = rtrim($user_base_upload_dir . '/' . $file_info['server_folder_path'] . $file_info['server_filename'], '/');

    if (!file_exists($full_disk_path) || !is_readable($full_disk_path)) {
        error_log("Arquivo físico não encontrado ou não legível: " . $full_disk_path . " para file_id: " . $file_id);
        header('Content-Type: application/json');
        http_response_code(404); // Ou 500 se for uma inconsistência interna
        echo json_encode(['error' => 'Arquivo físico não encontrado no servidor.']);
        exit;
    }

    // Limpar qualquer buffer de saída anterior
    if (ob_get_level()) {
        ob_end_clean();
    }

    // Configurar headers baseados no tipo MIME
    $mime_type = $file_info['mime_type'] ?: 'application/octet-stream';
    
    // Remover X-Frame-Options para PDFs e documentos quando inline=1
    if (isset($_GET['inline']) && $_GET['inline'] == '1') {
        if (in_array($mime_type, [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ])) {
            header('X-Frame-Options: ALLOW-FROM ' . $_SERVER['HTTP_ORIGIN']);
        }
    }
    
    // Definir cabeçalhos para o download
    header('Content-Description: File Transfer');
    header('Content-Type: ' . $mime_type);
    
    if (isset($_GET['inline']) && $_GET['inline'] == '1') {
        header('Content-Disposition: inline; filename="' . basename($file_info['name']) . '"');
    } else {
        header('Content-Disposition: attachment; filename="' . basename($file_info['name']) . '"');
            header('Expires: 0');
            header('Cache-Control: must-revalidate');
            header('Pragma: public');
            header('Content-Length: ' . $file_info['size']);
            break;
        
        case 'image/jpeg':
        case 'image/png':
        case 'image/gif':
            header('Content-Type: ' . $mime_type);
            header('Content-Disposition: inline; filename="' . basename($file_info['name']) . '"');
            header('Expires: 0');
            header('Cache-Control: must-revalidate');
            header('Pragma: public');
            header('Content-Length: ' . $file_info['size']);
            break;
        
        default:
            header('Content-Type: ' . $mime_type);
            header('Content-Disposition: attachment; filename="' . basename($file_info['name']) . '"');
            header('Expires: 0');
            header('Cache-Control: must-revalidate');
            header('Pragma: public');
            header('Content-Length: ' . $file_info['size']);
            break;
    }

    // Ler e enviar o arquivo em chunks para economizar memória com arquivos grandes
    $chunk_size = 1024 * 1024; // 1MB por chunk
    $handle = fopen($full_disk_path, 'rb');
    if ($handle === false) {
        error_log("Não foi possível abrir o arquivo para leitura: " . $full_disk_path);
        // Não podemos mais enviar header JSON aqui se os headers de download já foram enviados.
        // A conexão será provavelmente cortada ou um download parcial/corrompido ocorrerá.
        // Idealmente, checar is_readable() antes de enviar headers.
        http_response_code(500); // Tentar setar antes que algo seja enviado
        exit; // Sair para evitar mais output.
    }

    while (!feof($handle)) {
        echo fread($handle, $chunk_size);
        flush(); // Envia o buffer de saída para o navegador
        if (connection_aborted()) { // Se o usuário cancelar o download
            break;
        }
    }
    fclose($handle);
    exit;

} catch (PDOException $e) {
    error_log("Erro de PDO em download.php: " . $e->getMessage());
    // Se headers já foram enviados, não podemos mudar para JSON.
    // Este erro provavelmente ocorreria antes do envio de headers de download.
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['error' => 'Erro de banco de dados.']);
    exit;
} catch (Exception $e) {
    error_log("Erro geral em download.php: " . $e->getMessage());
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['error' => 'Ocorreu um erro inesperado.']);
    exit;
}
?>
