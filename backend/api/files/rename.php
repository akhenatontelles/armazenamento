<?php
// backend/api/files/rename.php
require_once __DIR__ . '/../../includes/functions.php';
require_once __DIR__ . '/../../includes/db_connect.php';

secure_session_start();

if (!is_user_logged_in()) {
    json_response(401, ['error' => 'Acesso não autorizado. Por favor, faça login.']);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, ['error' => 'Método não permitido. Use POST.']);
}

$user_id = get_logged_in_user_id();

$input = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($input)) {
    json_response(400, ['error' => 'JSON inválido ou malformado.']);
}

$file_id = $input['id'] ?? '';
$new_original_name = $input['newName'] ?? ''; // Nome de exibição

if (empty($file_id) || empty($new_original_name)) {
    json_response(400, ['error' => 'ID do arquivo/pasta e novo nome são obrigatórios.']);
}
if (strlen($new_original_name) > 255) {
    json_response(400, ['error' => 'Novo nome (exibição) muito longo (máx 255).']);
}

$new_server_name_on_disk = sanitize_filename($new_original_name); // Para pastas, o nome no disco é o nome sanitizado. Para arquivos, o nome no disco é um UUID.
if (empty($new_server_name_on_disk)) {
    json_response(400, ['error' => 'Novo nome resulta em nome inválido no servidor após sanitização.']);
}


$pdo = getPDOConnection();
if (!$pdo) {
    json_response(500, ['error' => 'Falha na conexão com o banco de dados.']);
}

try {
    $pdo->beginTransaction();

    // Obter informações do arquivo/pasta atual
    $stmt_get = $pdo->prepare("SELECT id, name, type, parent_id, server_filename, server_folder_path FROM files WHERE id = :id AND user_id = :user_id");
    $stmt_get->bindParam(':id', $file_id, PDO::PARAM_STR);
    $stmt_get->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $stmt_get->execute();
    $item = $stmt_get->fetch(PDO::FETCH_ASSOC);

    if (!$item) {
        $pdo->rollBack();
        json_response(404, ['error' => 'Arquivo ou pasta não encontrado.']);
    }

    // Verificar se já existe um item com o novo nome de EXIBIÇÃO no mesmo diretório e do mesmo tipo
    $check_sql = "SELECT id FROM files WHERE user_id = :user_id AND name = :new_name AND type = :type AND id != :current_id ";
    if ($item['parent_id'] === null) {
        $check_sql .= "AND parent_id IS NULL";
    } else {
        $check_sql .= "AND parent_id = :parent_id";
    }
    $stmt_check = $pdo->prepare($check_sql);
    $stmt_check->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $stmt_check->bindParam(':new_name', $new_original_name, PDO::PARAM_STR);
    $stmt_check->bindParam(':type', $item['type'], PDO::PARAM_STR);
    $stmt_check->bindParam(':current_id', $file_id, PDO::PARAM_STR);
    if ($item['parent_id'] !== null) {
        $stmt_check->bindParam(':parent_id', $item['parent_id'], PDO::PARAM_STR);
    }
    $stmt_check->execute();
    if ($stmt_check->fetch()) {
        $pdo->rollBack();
        json_response(409, ['error' => "Um item do tipo '{$item['type']}' com o nome de exibição '{$new_original_name}' já existe neste local."]);
    }

    $user_base_upload_dir = rtrim(BASE_UPLOAD_PATH, '/') . '/' . $user_id;
    $old_full_disk_path = rtrim($user_base_upload_dir . '/' . $item['server_folder_path'] . $item['server_filename'], '/');

    $new_server_filename_for_item = $item['server_filename']; // Para arquivos, o server_filename (UUID.ext) não muda.
    if ($item['type'] === 'folder') {
        // Para pastas, o nome no disco (server_filename) também muda.
        $new_server_filename_for_item = $new_server_name_on_disk;
    }
    $new_full_disk_path = rtrim($user_base_upload_dir . '/' . $item['server_folder_path'] . $new_server_filename_for_item, '/');


    // Renomear no sistema de arquivos APENAS SE o server_filename mudou (ou seja, é uma pasta)
    if ($item['type'] === 'folder' && $old_full_disk_path !== $new_full_disk_path) {
        if (file_exists($old_full_disk_path)) {
            if (file_exists($new_full_disk_path)) {
                 // Se o novo nome sanitizado colidir com algo que já existe no disco, mas não no DB (pela checagem de nome de exibição)
                $pdo->rollBack();
                json_response(409, ['error' => "Conflito de nome no sistema de arquivos. O nome '{$new_server_name_on_disk}' já existe."]);
            }
            if (!rename($old_full_disk_path, $new_full_disk_path)) {
                error_log("Falha ao renomear no sistema de arquivos: de '{$old_full_disk_path}' para '{$new_full_disk_path}'");
                $pdo->rollBack();
                json_response(500, ['error' => 'Erro ao renomear no servidor.']);
            }
        } else {
            // Pasta antiga não existe no disco, mas existe no DB. Inconsistência.
            error_log("Erro de inconsistência: Pasta '{$old_full_disk_path}' não encontrada no disco para renomear.");
            // Prosseguir com a atualização do DB, mas logar o erro.
        }
    }

    // Atualizar no banco de dados
    // Para arquivos, apenas 'name' (exibição) e 'updated_at' mudam.
    // Para pastas, 'name' (exibição), 'server_filename' (nome no disco) e 'updated_at' mudam.
    $sql_update = "UPDATE files SET name = :new_name, updated_at = CURRENT_TIMESTAMP ";
    if ($item['type'] === 'folder') {
        $sql_update .= ", server_filename = :new_server_filename ";
    }
    $sql_update .= "WHERE id = :id AND user_id = :user_id";

    $stmt_update = $pdo->prepare($sql_update);
    $stmt_update->bindParam(':new_name', $new_original_name, PDO::PARAM_STR);
    if ($item['type'] === 'folder') {
        $stmt_update->bindParam(':new_server_filename', $new_server_filename_for_item, PDO::PARAM_STR);
    }
    $stmt_update->bindParam(':id', $file_id, PDO::PARAM_STR);
    $stmt_update->bindParam(':user_id', $user_id, PDO::PARAM_INT);

    if ($stmt_update->execute()) {
        // Se uma pasta foi renomeada, os server_folder_path de todos os seus descendentes precisam ser atualizados.
        if ($item['type'] === 'folder' && $old_full_disk_path !== $new_full_disk_path) {
            $old_base_path_for_children = trim($item['server_folder_path'] . $item['server_filename'], '/') . '/';
            if ($old_base_path_for_children === '/') $old_base_path_for_children = "";

            $new_base_path_for_children = trim($item['server_folder_path'] . $new_server_filename_for_item, '/') . '/';
            if ($new_base_path_for_children === '/') $new_base_path_for_children = "";

            $stmt_update_children = $pdo->prepare(
                "UPDATE files
                 SET server_folder_path = REPLACE(server_folder_path, :old_path_prefix, :new_path_prefix),
                     updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = :user_id AND server_folder_path LIKE :like_old_path_prefix"
            );
            // O prefixo para REPLACE precisa ser o início exato do server_folder_path dos filhos.
            // Ex: pai era "A/", filho tinha server_folder_path "A/B/". Se pai vira "Z/", filho precisa ser "Z/B/"
            // server_folder_path do filho = "A/B/"
            // old_path_prefix para o filho = "A/"
            // new_path_prefix para o filho = "Z/"
            $stmt_update_children->bindValue(':old_path_prefix', $old_base_path_for_children, PDO::PARAM_STR);
            $stmt_update_children->bindValue(':new_path_prefix', $new_base_path_for_children, PDO::PARAM_STR);
            $stmt_update_children->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $stmt_update_children->bindValue(':like_old_path_prefix', $old_base_path_for_children . '%', PDO::PARAM_STR);
            $stmt_update_children->execute();
        }

        $pdo->commit();
        json_response(200, [
            'message' => 'Item renomeado com sucesso.',
            'id' => $file_id,
            'newName' => $new_original_name, // Retorna o nome de exibição
            'newServerFilename' => ($item['type'] === 'folder' ? $new_server_filename_for_item : $item['server_filename']) // Retorna o server_filename atualizado
        ]);
    } else {
        $pdo->rollBack();
        // Reverter renomeação no sistema de arquivos se a atualização do DB falhar
        if ($item['type'] === 'folder' && $old_full_disk_path !== $new_full_disk_path && file_exists($new_full_disk_path)) {
            @rename($new_full_disk_path, $old_full_disk_path);
        }
        error_log("Falha ao atualizar nome no DB para id: " . $file_id);
        json_response(500, ['error' => 'Erro ao salvar novo nome.']);
    }

} catch (PDOException $e) {
    if($pdo->inTransaction()) $pdo->rollBack();
    error_log("Erro de PDO em rename.php: " . $e->getMessage());
    json_response(500, ['error' => 'Erro de banco de dados.']);
} catch (Exception $e) {
    if($pdo->inTransaction()) $pdo->rollBack();
    error_log("Erro geral em rename.php: " . $e->getMessage());
    json_response(500, ['error' => 'Ocorreu um erro inesperado.']);
}
?>
