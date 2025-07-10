<?php
// backend/api/files/search.php
require_once __DIR__ . '/../../includes/functions.php';
require_once __DIR__ . '/../../includes/db_connect.php';

secure_session_start();

if (!is_user_logged_in()) {
    json_response(401, ['error' => 'Acesso não autorizado. Por favor, faça login.']);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(405, ['error' => 'Método não permitido. Use GET.']);
}

$user_id = get_logged_in_user_id();
$query = $_GET['query'] ?? '';

if (empty($query)) {
    json_response(400, ['error' => 'Termo de busca (query) é obrigatório.']);
}
if (strlen($query) < 2) { // Evitar buscas muito genéricas/pesadas
    json_response(400, ['error' => 'Termo de busca deve ter pelo menos 2 caracteres.']);
}


$pdo = getPDOConnection();
if (!$pdo) {
    json_response(500, ['error' => 'Falha na conexão com o banco de dados.']);
}

try {
    // A busca será pelo nome do arquivo/pasta.
    // Para busca pelo caminho completo, precisaríamos construir/armazenar o caminho completo no DB ou fazer queries recursivas.
    // Para simplificar, buscamos apenas no campo 'name'.
    $search_term = '%' . $query . '%';

    $stmt = $pdo->prepare(
        "SELECT id, name, type, mime_type, size, parent_id, created_at, updated_at, server_folder_path, server_filename
         FROM files
         WHERE user_id = :user_id AND name LIKE :query
         ORDER BY type DESC, name ASC"
    );
    $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->bindParam(':query', $search_term, PDO::PARAM_STR);
    $stmt->execute();
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Para cada resultado, construir o caminho de exibição completo
    // Esta é uma operação N+1 se feita ingenuamente. Melhor otimizar se possível.
    // Uma função para buscar o caminho recursivamente:
    function get_full_path_for_item($itemId, $userId, PDO $db_conn): string {
        $path_array = [];
        $current_id = $itemId;
        $max_depth = 10; // Prevenir loops infinitos
        $depth = 0;

        while ($current_id !== null && $depth < $max_depth) {
            $s = $db_conn->prepare("SELECT name, parent_id FROM files WHERE id = :id AND user_id = :user_id");
            $s->bindParam(':id', $current_id, PDO::PARAM_STR);
            $s->bindParam(':user_id', $userId, PDO::PARAM_INT);
            $s->execute();
            $item = $s->fetch(PDO::FETCH_ASSOC);

            if ($item) {
                array_unshift($path_array, $item['name']);
                $current_id = $item['parent_id'];
            } else {
                $current_id = null; // Item não encontrado ou pertence a outro usuário
            }
            $depth++;
        }
        return '/' . implode('/', $path_array);
    }

    $processed_results = array_map(function($file) use ($user_id, $pdo) {
        if ($file['type'] === 'file') {
            $file['url'] = API_BASE_URL . "/files/download.php?id=" . $file['id'];
        }
        if (isset($file['size'])) {
            $file['size'] = (int)$file['size'];
        }
        // Adicionar o caminho completo para exibição no frontend
        $file['path'] = get_full_path_for_item($file['id'], $user_id, $pdo);
        return $file;
    }, $results);


    json_response(200, $processed_results);

} catch (PDOException $e) {
    error_log("Erro de PDO em search.php: " . $e->getMessage());
    json_response(500, ['error' => 'Erro de banco de dados ao buscar arquivos.']);
} catch (Exception $e) {
    error_log("Erro geral em search.php: " . $e->getMessage());
    json_response(500, ['error' => 'Ocorreu um erro inesperado ao buscar arquivos.']);
}
?>
