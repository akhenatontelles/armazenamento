<?php
// backend/api/files/delete.php
require_once __DIR__ . '/../../includes/functions.php';
require_once __DIR__ . '/../../includes/db_connect.php';

secure_session_start();

if (!is_user_logged_in()) {
    json_response(401, ['error' => 'Acesso não autorizado. Por favor, faça login.']);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { // Ou DELETE, mas POST é mais fácil com JSON body
    json_response(405, ['error' => 'Método não permitido. Use POST.']);
}

$user_id = get_logged_in_user_id();

$input = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($input)) {
    json_response(400, ['error' => 'JSON inválido ou malformado.']);
}

$item_id = $input['id'] ?? '';

if (empty($item_id)) {
    json_response(400, ['error' => 'ID do item a ser excluído é obrigatório.']);
}

$pdo = getPDOConnection();
if (!$pdo) {
    json_response(500, ['error' => 'Falha na conexão com o banco de dados.']);
}

try {
    $pdo->beginTransaction();

    // Coletar informações do item a ser excluído e todos os seus descendentes (se for uma pasta)
    $items_to_delete_info = []; // [ ['id' => ..., 'type' => ..., 'server_folder_path' => ..., 'server_filename' => ...], ... ]
    $queue = [$item_id];
    $visited_ids_for_db_deletion = []; // Para evitar processamento duplicado e para a query DELETE

    while (!empty($queue)) {
        $current_id_to_process = array_shift($queue);
        if(in_array($current_id_to_process, $visited_ids_for_db_deletion)) continue;

        $stmt_item = $pdo->prepare("SELECT id, type, server_folder_path, server_filename FROM files WHERE id = :id AND user_id = :user_id");
        $stmt_item->bindParam(':id', $current_id_to_process, PDO::PARAM_STR);
        $stmt_item->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt_item->execute();
        $item_info = $stmt_item->fetch(PDO::FETCH_ASSOC);

        if (!$item_info) {
            // Se o item principal não for encontrado, pode ser um erro ou já foi excluído.
            if ($current_id_to_process === $item_id) {
                $pdo->rollBack();
                json_response(404, ['error' => 'Item não encontrado ou você não tem permissão para excluí-lo.']);
            }
            // Se um filho não for encontrado, apenas pular (pode ter sido excluído em outra operação)
            continue;
        }

        $items_to_delete_info[] = $item_info;
        $visited_ids_for_db_deletion[] = $item_info['id'];

        if ($item_info['type'] === 'folder') {
            $stmt_children = $pdo->prepare("SELECT id FROM files WHERE parent_id = :parent_id AND user_id = :user_id");
            $stmt_children->bindParam(':parent_id', $item_info['id'], PDO::PARAM_STR);
            $stmt_children->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $stmt_children->execute();
            while ($child = $stmt_children->fetch(PDO::FETCH_ASSOC)) {
                if(!in_array($child['id'], $visited_ids_for_db_deletion)) { // Para evitar loops infinitos se houver ciclos (não deveria)
                    $queue[] = $child['id'];
                }
            }
        }
    }

    if (empty($items_to_delete_info)) {
        // Isso pode acontecer se o item_id inicial não pertencer ao usuário ou não existir.
        // A primeira query dentro do loop já trataria isso para o item_id principal.
        $pdo->rollBack();
        json_response(404, ['error' => 'Nenhum item encontrado para exclusão.']);
    }

    // Excluir do sistema de arquivos (do mais profundo para o mais superficial para pastas)
    // Reverter a ordem para excluir arquivos antes de suas pastas pai
    $reversed_items_for_fs_deletion = array_reverse($items_to_delete_info);
    $user_base_upload_dir = rtrim(BASE_UPLOAD_PATH, '/') . '/' . $user_id;

    foreach ($reversed_items_for_fs_deletion as $item_fs) {
        $full_disk_path = rtrim($user_base_upload_dir . '/' . $item_fs['server_folder_path'] . $item_fs['server_filename'], '/');

        if (file_exists($full_disk_path) || is_dir($full_disk_path)) { // is_dir é redundante se file_exists já checa
            if ($item_fs['type'] === 'file') {
                if (!@unlink($full_disk_path)) {
                    error_log("Falha ao excluir arquivo do disco: " . $full_disk_path);
                    // Considerar se deve parar ou continuar. Por enquanto, continua e tenta excluir do DB.
                }
            } elseif ($item_fs['type'] === 'folder') {
                // Tentar remover diretório. rmdir só funciona em diretórios vazios.
                // Como estamos excluindo filhos primeiro (devido ao reverse), deve funcionar se todos os arquivos filhos foram excluídos com sucesso.
                if (!@rmdir($full_disk_path)) {
                    // Se falhar, pode ser que não esteja vazio (arquivos não foram excluídos ou erro de permissão)
                    error_log("Falha ao excluir diretório do disco (pode não estar vazio ou permissão): " . $full_disk_path);
                }
            }
        } else {
            error_log("Aviso: Item '{$item_fs['name']}' (path: {$full_disk_path}) não encontrado no disco para exclusão física.");
        }
    }

    // Excluir do banco de dados (usando os IDs coletados)
    if (!empty($visited_ids_for_db_deletion)) {
        $placeholders = implode(',', array_fill(0, count($visited_ids_for_db_deletion), '?'));
        $sql_delete_db = "DELETE FROM files WHERE user_id = ? AND id IN ($placeholders)";
        $stmt_delete_db = $pdo->prepare($sql_delete_db);

        $params_for_delete = array_merge([$user_id], $visited_ids_for_db_deletion);

        if (!$stmt_delete_db->execute($params_for_delete)) {
            $pdo->rollBack();
            error_log("Falha ao excluir itens do DB. UserID: {$user_id}, IDs: " . implode(',', $visited_ids_for_db_deletion));
            json_response(500, ['error' => 'Erro ao excluir itens do banco de dados.']);
        }
    }

    $pdo->commit();
    json_response(200, ['message' => 'Item(s) excluído(s) com sucesso.']);

} catch (PDOException $e) {
    if($pdo->inTransaction()) $pdo->rollBack();
    error_log("Erro de PDO em delete.php: " . $e->getMessage());
    json_response(500, ['error' => 'Erro de banco de dados.']);
} catch (Exception $e) {
    if($pdo->inTransaction()) $pdo->rollBack();
    error_log("Erro geral em delete.php: " . $e->getMessage());
    json_response(500, ['error' => 'Ocorreu um erro inesperado.']);
}
?>
