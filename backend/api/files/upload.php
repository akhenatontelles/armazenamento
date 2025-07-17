<?php
// backend/api/files/upload.php
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

// Dados do formulário (FormData)
$parent_id_input = $_POST['parentId'] ?? null; // ID da pasta pai no DB
$parent_id = (empty($parent_id_input) || $parent_id_input === 'null' || $parent_id_input === 'undefined') ? null : $parent_id_input;

// webkitRelativePath é enviado pelo input de diretório e pelo drag-n-drop do frontend
$webkit_relative_path = $_POST['webkitRelativePath'] ?? null;

if (!isset($_FILES['file'])) {
    json_response(400, ['error' => 'Nenhum arquivo enviado ou erro no upload (verifique o nome do campo "file").']);
}

$file_upload = $_FILES['file'];

if ($file_upload['error'] !== UPLOAD_ERR_OK) {
    $upload_errors = [
        UPLOAD_ERR_INI_SIZE   => "Arquivo excede a diretiva upload_max_filesize no php.ini.",
        UPLOAD_ERR_FORM_SIZE  => "Arquivo excede a diretiva MAX_FILE_SIZE especificada no formulário HTML.",
        UPLOAD_ERR_PARTIAL    => "Upload feito parcialmente.",
        UPLOAD_ERR_NO_FILE    => "Nenhum arquivo foi enviado.",
        UPLOAD_ERR_NO_TMP_DIR => "Faltando uma pasta temporária.",
        UPLOAD_ERR_CANT_WRITE => "Falha ao escrever arquivo no disco.",
        UPLOAD_ERR_EXTENSION  => "Uma extensão PHP parou o upload do arquivo.",
    ];
    $error_message = $upload_errors[$file_upload['error']] ?? "Erro desconhecido no upload.";
    json_response(400, ['error' => $error_message]);
}

$original_filename = $file_upload['name'];
$file_tmp_path = $file_upload['tmp_name'];
$file_size = $file_upload['size'];
$file_mime_type = mime_content_type($file_tmp_path); // Obter MIME type real do conteúdo

if (empty($original_filename)) {
    json_response(400, ['error' => 'Nome do arquivo original está vazio.']);
}
if ($file_size === 0) {
    // Permitir arquivos vazios? Decisão: não permitir arquivos de 0 bytes.
    json_response(400, ['error' => 'Arquivo enviado está vazio (0 bytes).']);
}

// Validação de tamanho máximo
if ($file_size > MAX_UPLOAD_SIZE_BYTES) {
    json_response(400, ['error' => 'Arquivo muito grande. Tamanho máximo permitido: ' . (MAX_UPLOAD_SIZE_BYTES / 1024 / 1024) . ' MB.']);
}

// Validação de tipo MIME
// $file_mime_type é obtido de mime_content_type(), que é mais confiável que $_FILES['file']['type']
if (!in_array($file_mime_type, ALLOWED_MIME_TYPES, true)) {
    // Log do tipo de arquivo tentado para depuração
    error_log("Tentativa de upload de tipo de arquivo não permitido: " . $file_mime_type . " para o arquivo " . $original_filename);
    json_response(400, ['error' => 'Tipo de arquivo não permitido (' . $file_mime_type . ').']);
}


$pdo = getPDOConnection();
if (!$pdo) {
    json_response(500, ['error' => 'Falha na conexão com o banco de dados.']);
}

try {
    $pdo->beginTransaction();

    $current_parent_id_for_db = $parent_id; // O parentId direto para este arquivo/pasta-folha
    $path_on_server_for_item = ""; // Caminho relativo à pasta do usuário onde o item (arquivo ou pasta-folha) será salvo

    // Se webkitRelativePath for fornecido, precisamos criar/verificar a estrutura de pastas
    if (!empty($webkit_relative_path)) {
        $path_parts = explode('/', trim($webkit_relative_path, '/'));
        // O último elemento é o nome do arquivo, os anteriores são pastas
        $folders_in_path = array_slice($path_parts, 0, -1);

        $current_path_key_for_map = ""; // Usado para construir o caminho completo para o map
        $current_parent_id_in_path_structure = $parent_id; // Começa com a pasta onde o upload foi iniciado

        foreach ($folders_in_path as $folder_name_part) {
            if(empty($folder_name_part)) continue;

            $sanitized_folder_name_part_for_disk = sanitize_filename($folder_name_part);
            if(empty($sanitized_folder_name_part_for_disk)) {
                 throw new Exception("Nome de subpasta inválido no caminho: " . $folder_name_part);
            }

            // Construir o caminho até a pasta pai da subpasta atual
            $parent_folder_disk_path_segment = $path_on_server_for_item;

            // Verificar se esta subpasta já existe no DB sob o parent_id_in_path_structure
            $stmt_check_folder = $pdo->prepare("SELECT id, server_filename, server_folder_path FROM files WHERE user_id = :user_id AND name = :name AND type = 'folder' AND ".($current_parent_id_in_path_structure ? "parent_id = :parent_id" : "parent_id IS NULL"));
            $stmt_check_folder->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $stmt_check_folder->bindParam(':name', $folder_name_part, PDO::PARAM_STR);
            if($current_parent_id_in_path_structure) $stmt_check_folder->bindParam(':parent_id', $current_parent_id_in_path_structure, PDO::PARAM_STR);
            $stmt_check_folder->execute();
            $existing_folder = $stmt_check_folder->fetch(PDO::FETCH_ASSOC);

            if ($existing_folder) {
                $current_parent_id_in_path_structure = $existing_folder['id'];
                $path_on_server_for_item = trim($existing_folder['server_folder_path'] . $existing_folder['server_filename'], '/') . '/';
            } else {
                // Criar a subpasta no DB e no disco
                $new_subfolder_id = generate_uuid_v4();

                $sql_create_subfolder = "INSERT INTO files (id, user_id, parent_id, name, type, server_filename, server_folder_path)
                                         VALUES (:id, :user_id, :parent_id, :name, 'folder', :server_filename, :server_folder_path)";
                $stmt_create_subfolder = $pdo->prepare($sql_create_subfolder);
                $stmt_create_subfolder->bindParam(':id', $new_subfolder_id, PDO::PARAM_STR);
                $stmt_create_subfolder->bindParam(':user_id', $user_id, PDO::PARAM_INT);
                $stmt_create_subfolder->bindParam(':parent_id', $current_parent_id_in_path_structure, $current_parent_id_in_path_structure ? PDO::PARAM_STR : PDO::PARAM_NULL);
                $stmt_create_subfolder->bindParam(':name', $folder_name_part, PDO::PARAM_STR);
                $stmt_create_subfolder->bindParam(':server_filename', $sanitized_folder_name_part_for_disk, PDO::PARAM_STR);
                $stmt_create_subfolder->bindParam(':server_folder_path', $parent_folder_disk_path_segment, PDO::PARAM_STR);

                if(!$stmt_create_subfolder->execute()){
                    throw new Exception("Falha ao criar subpasta '{$folder_name_part}' no banco de dados.");
                }

                // Criar no disco
                $user_base_upload_dir = rtrim(BASE_UPLOAD_PATH, '/') . '/' . $user_id;
                $disk_path_for_subfolder = rtrim($user_base_upload_dir . '/' . $parent_folder_disk_path_segment . $sanitized_folder_name_part_for_disk, '/');
                if (!is_dir($disk_path_for_subfolder) && !mkdir($disk_path_for_subfolder, 0775, true)) {
                    throw new Exception("Falha ao criar diretório da subpasta '{$sanitized_folder_name_part_for_disk}' no servidor.");
                }

                $current_parent_id_in_path_structure = $new_subfolder_id;
                $path_on_server_for_item = trim($parent_folder_disk_path_segment . $sanitized_folder_name_part_for_disk, '/') . '/';
            }
        }
        // Após o loop, $current_parent_id_in_path_structure é o ID da pasta onde o arquivo será colocado
        // e $path_on_server_for_item é o server_folder_path para o arquivo.
        $current_parent_id_for_db = $current_parent_id_in_path_structure;
    } else {
        // Se não há webkitRelativePath, o arquivo vai para a pasta $parent_id (que pode ser a raiz)
        // Precisamos do server_folder_path do $parent_id
        if ($parent_id) {
            $stmt_parent = $pdo->prepare("SELECT server_folder_path, server_filename FROM files WHERE id = :parent_id AND user_id = :user_id AND type = 'folder'");
            $stmt_parent->bindParam(':parent_id', $parent_id, PDO::PARAM_STR);
            $stmt_parent->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $stmt_parent->execute();
            $parent_folder_info = $stmt_parent->fetch(PDO::FETCH_ASSOC);
            if (!$parent_folder_info) {
                throw new Exception("Pasta pai direta não encontrada.");
            }
            $path_on_server_for_item = trim($parent_folder_info['server_folder_path'] . $parent_folder_info['server_filename'],'/') . '/';
            if ($path_on_server_for_item === '/') $path_on_server_for_item = "";
        } else {
            // Raiz do usuário
            $path_on_server_for_item = "";
        }
    }

    // Preparar nome do arquivo para o servidor (único) e para o DB (original)
    $sanitized_original_filename_for_db = sanitize_filename($original_filename); // Nome de exibição
    if(empty($sanitized_original_filename_for_db)) $sanitized_original_filename_for_db = "arquivo_sem_nome";

    $file_extension = pathinfo($original_filename, PATHINFO_EXTENSION);
    $server_filename_on_disk = generate_uuid_v4() . ($file_extension ? "." . $file_extension : "");

    // Caminho completo de destino no servidor
    $user_base_upload_dir = rtrim(BASE_UPLOAD_PATH, '/') . '/' . $user_id;
    if (!is_dir($user_base_upload_dir)) { // Garante que o diretório base do usuário exista
        mkdir($user_base_upload_dir, 0775, true);
    }
    $destination_path_on_server = rtrim($user_base_upload_dir . '/' . $path_on_server_for_item, '/') . '/' . $server_filename_on_disk;

    // Criar o diretório de destino final se não existir (path_on_server_for_item pode ter subpastas)
    $destination_directory = dirname($destination_path_on_server);
    if (!is_dir($destination_directory) && !mkdir($destination_directory, 0775, true)) {
        throw new Exception("Falha ao criar diretório de destino no servidor: {$destination_directory}");
    }

    // Mover o arquivo carregado para o local de destino
    if (!move_uploaded_file($file_tmp_path, $destination_path_on_server)) {
        throw new Exception("Falha ao mover arquivo carregado para o destino final.");
    }

    // Inserir registro do arquivo no banco de dados
    $new_file_id = generate_uuid_v4();
    // Corrigido: A ordem dos placeholders VALUES() deve corresponder à lista de colunas.
    $sql_insert_file = "INSERT INTO files (id, user_id, parent_id, name, type, mime_type, size, server_filename, server_folder_path)
                        VALUES (:id, :user_id, :parent_id, :name, 'file', :mime_type, :size, :server_filename, :server_folder_path)";

    $stmt_insert_file = $pdo->prepare($sql_insert_file);
    $stmt_insert_file->bindParam(':id', $new_file_id, PDO::PARAM_STR);
    $stmt_insert_file->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $stmt_insert_file->bindParam(':parent_id', $current_parent_id_for_db, $current_parent_id_for_db ? PDO::PARAM_STR : PDO::PARAM_NULL);
    $stmt_insert_file->bindParam(':name', $original_filename, PDO::PARAM_STR);
    $stmt_insert_file->bindParam(':mime_type', $file_mime_type, PDO::PARAM_STR);
    $stmt_insert_file->bindParam(':size', $file_size, PDO::PARAM_INT);
    $stmt_insert_file->bindParam(':server_filename', $server_filename_on_disk, PDO::PARAM_STR);
    $stmt_insert_file->bindParam(':server_folder_path', $path_on_server_for_item, PDO::PARAM_STR);

    if ($stmt_insert_file->execute()) {
        $pdo->commit();
        json_response(201, [
            'message' => 'Arquivo enviado com sucesso!',
            'file' => [ // Retornar dados do arquivo para o frontend
                'id' => $new_file_id,
                'name' => $original_filename,
                'type' => 'file',
                'mime_type' => $file_mime_type,
                'size' => (int)$file_size,
                'parentId' => $current_parent_id_for_db,
                'createdAt' => date('Y-m-d H:i:s'),
                'updatedAt' => date('Y-m-d H:i:s'),
                'url' => API_BASE_URL . "/files/download.php?id=" . $new_file_id // URL para download
            ]
        ]);
    } else {
        throw new Exception("Falha ao salvar informações do arquivo no banco de dados.");
    }

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    // Se o arquivo foi movido, mas o DB falhou, remove o arquivo órfão.
    if (isset($destination_path_on_server) && file_exists($destination_path_on_server)) {
        @unlink($destination_path_on_server);
    }
    error_log("Erro de PDO em upload.php: " . $e->getMessage());
    json_response(500, ['error' => 'Erro de banco de dados durante o upload.']);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    // Se o arquivo foi movido, mas ocorreu outra exceção (ex: falha ao criar pasta), remove o arquivo.
    if (isset($destination_path_on_server) && file_exists($destination_path_on_server)) {
        @unlink($destination_path_on_server);
    }
    error_log("Erro geral em upload.php: " . $e->getMessage());
    json_response(500, ['error' => 'Erro interno do servidor: ' . $e->getMessage()]);
}
?>
