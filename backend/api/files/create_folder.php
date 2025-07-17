<?php
// backend/api/files/create_folder.php
require_once __DIR__ . '/../../config/config.php';
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

$original_folder_name = $input['name'] ?? '';
$parent_id_input = $input['parentId'] ?? null;
$parent_id = (empty($parent_id_input) || $parent_id_input === 'null') ? null : $parent_id_input;

if (empty($original_folder_name)) {
    json_response(400, ['error' => 'Nome da pasta é obrigatório.']);
}
if (strlen($original_folder_name) > 255) {
     json_response(400, ['error' => 'Nome da pasta (exibição) muito longo (máx 255).']);
}

// O nome da pasta no servidor será o nome original sanitizado.
// Para arquivos, o server_filename pode ser um UUID para evitar conflitos, mas para pastas, usar o nome (sanitizado) é mais comum.
$server_folder_name_on_disk = sanitize_filename($original_folder_name);
if (empty($server_folder_name_on_disk)) {
    json_response(400, ['error' => 'Nome da pasta resulta em nome inválido no servidor após sanitização.']);
}
if (strlen($server_folder_name_on_disk) > 200) { // Limite do sanitize_filename
     json_response(400, ['error' => 'Nome da pasta (servidor) muito longo após sanitização.']);
}


$pdo = getPDOConnection();
if (!$pdo) {
    json_response(500, ['error' => 'Falha na conexão com o banco de dados.']);
}

try {
    $pdo->beginTransaction();

    // Determinar o server_folder_path da nova pasta (caminho *até* ela, não incluindo seu nome)
    $path_until_new_folder_relative_to_user_root = "";
    if ($parent_id) {
        $stmt_parent = $pdo->prepare("SELECT server_folder_path, server_filename FROM files WHERE id = :parent_id AND user_id = :user_id AND type = 'folder'");
        $stmt_parent->bindParam(':parent_id', $parent_id, PDO::PARAM_STR);
        $stmt_parent->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt_parent->execute();
        $parent_folder_info = $stmt_parent->fetch(PDO::FETCH_ASSOC);

        if (!$parent_folder_info) {
            $pdo->rollBack();
            json_response(404, ['error' => 'Pasta pai não encontrada ou inválida.']);
        }
        // Path até a nova pasta = path_do_pai/nome_do_pai_no_disco/
        $path_until_new_folder_relative_to_user_root = trim($parent_folder_info['server_folder_path'] . $parent_folder_info['server_filename'], '/') . '/';
        if ($path_until_new_folder_relative_to_user_root === '/') $path_until_new_folder_relative_to_user_root = ""; // Raiz do pai
    }

    // Verificar se já existe uma pasta/arquivo com esse nome de EXIBIÇÃO nesse local no DB
    $check_sql = "SELECT id FROM files WHERE user_id = :user_id AND name = :name AND type = 'folder' ";
    if ($parent_id === null) {
        $check_sql .= "AND parent_id IS NULL";
    } else {
        $check_sql .= "AND parent_id = :parent_id";
    }
    $stmt_check = $pdo->prepare($check_sql);
    $stmt_check->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $stmt_check->bindParam(':name', $original_folder_name, PDO::PARAM_STR); // Checa pelo nome de exibição
    if ($parent_id !== null) {
        $stmt_check->bindParam(':parent_id', $parent_id, PDO::PARAM_STR);
    }
    $stmt_check->execute();
    if ($stmt_check->fetch()) {
        $pdo->rollBack();
        json_response(409, ['error' => "Uma pasta com o nome de exibição '{$original_folder_name}' já existe neste local."]);
    }

    // Caminho completo no servidor para o diretório da nova pasta
    $user_base_upload_dir = rtrim(BASE_UPLOAD_PATH, '/') . '/' . $user_id;
    $full_disk_path_for_new_folder_dir = rtrim($user_base_upload_dir . '/' . $path_until_new_folder_relative_to_user_root . $server_folder_name_on_disk, '/');

    // Criar diretório no sistema de arquivos
    if (!is_dir($user_base_upload_dir)) {
        if (!mkdir($user_base_upload_dir, 0775, true)) {
            error_log("Falha ao criar diretório base do usuário: " . $user_base_upload_dir);
            $pdo->rollBack();
            json_response(500, ['error' => 'Erro ao configurar armazenamento do usuário.']);
        }
    }
    if (is_dir($full_disk_path_for_new_folder_dir)) {
        error_log("Aviso: Diretório físico já existe para {$full_disk_path_for_new_folder_dir}. Verificando consistência com DB.");
        // Se já existe no disco, mas não no DB (verificado acima), pode ser de uma tentativa falha.
        // A verificação de duplicidade no DB pelo nome de exibição já foi feita.
        // Poderia haver uma verificação adicional pelo server_filename no disco, mas pode ser complexo.
    } elseif (!mkdir($full_disk_path_for_new_folder_dir, 0775, true)) {
        error_log("Falha ao criar diretório físico: " . $full_disk_path_for_new_folder_dir);
        $pdo->rollBack();
        json_response(500, ['error' => 'Erro ao criar diretório da pasta no servidor.']);
    }

    // Inserir no banco de dados
    $new_folder_id = generate_uuid_v4();

    $sql = "INSERT INTO files (id, user_id, parent_id, name, type, server_filename, server_folder_path, size, mime_type)
            VALUES (:id, :user_id, :parent_id, :name, 'folder', :server_filename, :server_folder_path, NULL, NULL)";
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':id', $new_folder_id, PDO::PARAM_STR);
    $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->bindParam(':parent_id', $parent_id, $parent_id === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
    $stmt->bindParam(':name', $original_folder_name, PDO::PARAM_STR); // Nome de exibição
    $stmt->bindParam(':server_filename', $server_folder_name_on_disk, PDO::PARAM_STR); // Nome no disco
    $stmt->bindParam(':server_folder_path', $path_until_new_folder_relative_to_user_root, PDO::PARAM_STR); // Caminho ATÉ a pasta

    if ($stmt->execute()) {
        $pdo->commit();
        json_response(201, [
            'id' => $new_folder_id,
            'name' => $original_folder_name,
            'type' => 'folder',
            'parentId' => $parent_id,
            'mime_type' => null,
            'size' => null,
            'createdAt' => date('Y-m-d H:i:s'),
            'updatedAt' => date('Y-m-d H:i:s'),
        ]);
    } else {
        $pdo->rollBack();
        // Tentar remover o diretório físico criado se a inserção no DB falhar
        if (is_dir($full_disk_path_for_new_folder_dir) && !isset($parent_folder_info) /* Evita apagar se o dir já existia por outra razão */) {
             // Cuidado: rmdir só funciona em diretórios vazios.
             // Se mkdir criou pais, eles não serão removidos aqui.
            @rmdir($full_disk_path_for_new_folder_dir);
        }
        error_log("Falha ao inserir pasta no DB. Erro: " . implode(":", $stmt->errorInfo()) . " Path físico: " . $full_disk_path_for_new_folder_dir);
        json_response(500, ['error' => 'Erro ao salvar informações da pasta.']);
    }

} catch (PDOException $e) {
    if($pdo->inTransaction()) $pdo->rollBack();
    error_log("Erro de PDO em create_folder.php: " . $e->getMessage());
    json_response(500, ['error' => 'Erro de banco de dados: ' . $e->getMessage()]);
} catch (Exception $e) {
    if($pdo->inTransaction()) $pdo->rollBack();
    error_log("Erro geral em create_folder.php: " . $e->getMessage());
    json_response(500, ['error' => 'Ocorreu um erro inesperado.']);
}

?>
