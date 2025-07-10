<?php
// backend/api/files/list.php
require_once __DIR__ . '/../../includes/functions.php';
require_once __DIR__ . '/../../includes/db_connect.php';

secure_session_start();

// Verificar se o usuário está logado
if (!is_user_logged_in()) {
    json_response(401, ['error' => 'Acesso não autorizado. Por favor, faça login.']);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(405, ['error' => 'Método não permitido. Use GET.']);
}

$user_id = get_logged_in_user_id();

// `folder_id` pode ser null ou não existir para a raiz do usuário.
// Se não for fornecido ou for uma string vazia, consideramos como a raiz (parent_id IS NULL).
$folder_id_input = $_GET['folder_id'] ?? null;
$parent_id = (empty($folder_id_input) || $folder_id_input === 'null') ? null : $folder_id_input;


$pdo = getPDOConnection();
if (!$pdo) {
    json_response(500, ['error' => 'Falha na conexão com o banco de dados.']);
}

try {
    $sql = "SELECT id, name, type, mime_type, size, created_at, updated_at
            FROM files
            WHERE user_id = :user_id ";

    if ($parent_id === null) {
        $sql .= "AND parent_id IS NULL ";
    } else {
        $sql .= "AND parent_id = :parent_id ";
    }
    $sql .= "ORDER BY type DESC, name ASC"; // Pastas primeiro, depois arquivos, ambos por nome

    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    if ($parent_id !== null) {
        $stmt->bindParam(':parent_id', $parent_id, PDO::PARAM_STR);
    }

    $stmt->execute();
    $files = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // O frontend espera 'url' para arquivos. Para o backend, essa URL será para download.
    // E 'path' para resultados de busca. A listagem normal não precisa de 'path' completo.
    $processed_files = array_map(function($file) {
        if ($file['type'] === 'file') {
            // A URL para o frontend será o endpoint de download/visualização do backend.
            // Exemplo: /backend/api/files/download.php?id=FILE_ID
            // Ou um endpoint de preview: /backend/api/files/preview.php?id=FILE_ID
            // Para simplificar, vamos construir uma URL de download.
            // O frontend decidirá se tenta preview ou download com base no mime_type.
            $file['url'] = API_BASE_URL . "/files/download.php?id=" . $file['id'];
        }
        // Convert size to integer if not null
        if (isset($file['size'])) {
            $file['size'] = (int)$file['size'];
        }
        return $file;
    }, $files);

    json_response(200, $processed_files);

} catch (PDOException $e) {
    error_log("Erro de PDO em list.php: " . $e->getMessage());
    json_response(500, ['error' => 'Erro de banco de dados ao listar arquivos.']);
} catch (Exception $e) {
    error_log("Erro geral em list.php: " . $e->getMessage());
    json_response(500, ['error' => 'Ocorreu um erro inesperado ao listar arquivos.']);
}
?>
