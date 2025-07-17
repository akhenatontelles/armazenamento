<?php

require_once __DIR__ . '/../../includes/functions.php';
require_once __DIR__ . '/../../includes/db_connect.php';

// Inicia a sessão de forma segura
secure_session_start();

// Validação inicial
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, ['error' => 'Método não permitido. Use POST.']);
}

if (!is_user_logged_in()) {
    json_response(401, ['error' => 'Acesso não autorizado. Por favor, faça login.']);
}

if (!isset($_FILES['file'])) {
    json_response(400, ['error' => 'Nenhum arquivo enviado.']);
}

$file_upload = $_FILES['file'];
$user_id = get_logged_in_user_id();
$parent_id = $_POST['parentId'] ?? null;
if ($parent_id === 'null' || $parent_id === 'undefined') {
    $parent_id = null;
}

// Tratamento de erros de upload do PHP
if ($file_upload['error'] !== UPLOAD_ERR_OK) {
    $upload_errors = [
        UPLOAD_ERR_INI_SIZE   => "Arquivo excede o limite de tamanho do servidor.",
        UPLOAD_ERR_FORM_SIZE  => "Arquivo excede o limite de tamanho do formulário.",
        UPLOAD_ERR_PARTIAL    => "O upload do arquivo foi feito parcialmente.",
        UPLOAD_ERR_NO_FILE    => "Nenhum arquivo foi enviado.",
        UPLOAD_ERR_NO_TMP_DIR => "Pasta temporária não encontrada.",
        UPLOAD_ERR_CANT_WRITE => "Falha ao escrever arquivo no disco.",
        UPLOAD_ERR_EXTENSION  => "Uma extensão do PHP interrompeu o upload.",
    ];
    $error_message = $upload_errors[$file_upload['error']] ?? "Erro desconhecido no upload.";
    json_response(400, ['error' => $error_message]);
}

$original_filename = $file_upload['name'];
$file_tmp_path = $file_upload['tmp_name'];
$file_size = $file_upload['size'];
$file_mime_type = mime_content_type($file_tmp_path);

// Validações adicionais
if (empty($original_filename)) {
    json_response(400, ['error' => 'Nome do arquivo é inválido.']);
}
if ($file_size === 0) {
    json_response(400, ['error' => 'Arquivos vazios não são permitidos.']);
}
if ($file_size > MAX_UPLOAD_SIZE_BYTES) {
    json_response(400, ['error' => 'Arquivo muito grande.']);
}
if (!in_array($file_mime_type, ALLOWED_MIME_TYPES, true)) {
    json_response(400, ['error' => 'Tipo de arquivo não permitido.']);
}

$pdo = getPDOConnection();
$destination_path = null;

try {
    $pdo->beginTransaction();

    // Determina o caminho da pasta pai
    $server_folder_path = '';
    if ($parent_id) {
        $stmt = $pdo->prepare("SELECT server_folder_path, server_filename FROM files WHERE id = :id AND user_id = :user_id AND type = 'folder'");
        $stmt->execute(['id' => $parent_id, 'user_id' => $user_id]);
        $parent_folder = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$parent_folder) {
            throw new Exception("Pasta de destino não encontrada.");
        }
        $server_folder_path = trim($parent_folder['server_folder_path'] . $parent_folder['server_filename'], '/') . '/';
    }

    // Prepara o nome do arquivo para o servidor
    $file_extension = pathinfo($original_filename, PATHINFO_EXTENSION);
    $server_filename = generate_uuid_v4() . ($file_extension ? '.' . $file_extension : '');

    // Monta o caminho de destino e cria o diretório se não existir
    $user_upload_dir = rtrim(BASE_UPLOAD_PATH, '/') . '/' . $user_id;
    $destination_folder = $user_upload_dir . '/' . $server_folder_path;
    if (!is_dir($destination_folder)) {
        if (!mkdir($destination_folder, 0775, true)) {
            throw new Exception("Não foi possível criar o diretório de destino.");
        }
    }
    $destination_path = $destination_folder . $server_filename;

    // Move o arquivo
    if (!move_uploaded_file($file_tmp_path, $destination_path)) {
        throw new Exception("Falha ao mover o arquivo para o destino final.");
    }

    // Insere o registro no banco de dados
    $new_file_id = generate_uuid_v4();
    $sql = "INSERT INTO files (id, user_id, parent_id, name, type, mime_type, size, server_filename, server_folder_path)
            VALUES (:id, :user_id, :parent_id, :name, 'file', :mime_type, :size, :server_filename, :server_folder_path)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':id' => $new_file_id,
        ':user_id' => $user_id,
        ':parent_id' => $parent_id,
        ':name' => $original_filename,
        ':mime_type' => $file_mime_type,
        ':size' => $file_size,
        ':server_filename' => $server_filename,
        ':server_folder_path' => $server_folder_path
    ]);

    $pdo->commit();

    // Retorna a resposta de sucesso
    json_response(201, [
        'message' => 'Arquivo enviado com sucesso!',
        'file' => [
            'id' => $new_file_id,
            'name' => $original_filename,
            'type' => 'file',
            'mime_type' => $file_mime_type,
            'size' => (int)$file_size,
            'parentId' => $parent_id,
        ]
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    // Se o arquivo foi movido, mas ocorreu um erro, remove o arquivo órfão
    if ($destination_path && file_exists($destination_path)) {
        @unlink($destination_path);
    }
    error_log("Erro no upload: " . $e->getMessage());
    json_response(500, ['error' => 'Erro interno do servidor durante o upload.']);
}
