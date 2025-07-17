import { useState, useCallback } from "react"; // Removed useEffect, using useCallback
import { useToast } from "@/hooks/use-toast";
import { FileItem } from "./types";
import { fetchApi, fetchWithFormData } from "@/config"; // Import API helpers
// fetchApi e fetchWithFormData já usam credentials: 'include' por padrão

export const useFileOperations = () => {
  // This 'files' state will now typically hold the content of the currently viewed folder,
  // or search results, rather than ALL files of the user.
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Added loading state
  const { toast } = useToast();

  // No longer loading from localStorage or using mock data here.
  // FileExplorer will call fetchFilesAndFolders on mount and navigation.

  // Removed saveFiles as localStorage is no longer used for file data.

  // Helper function to fetch files for a given folderId (null for root)
  const fetchFilesAndFolders = useCallback(async (folderId: string | null) => {
    setIsLoading(true);
    try {
      const response = await fetchApi(`/files/list.php?folder_id=${folderId || ''}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erro ao buscar arquivos." }));
        throw new Error(errorData.error || "Falha ao buscar arquivos.");
      }
      const data: FileItem[] = await response.json();
      // Convert date strings to Date objects if necessary (PHP might return strings)
      const processedData = data.map(item => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
        mimeType: item.mime_type // padroniza para camelCase
      }));
      setFiles(processedData);
    } catch (error: any) {
      console.error("Error fetching files:", error);
      toast({ title: "Erro ao Carregar Arquivos", description: error.message, variant: "destructive" });
      setFiles([]); // Clear files on error or set to a specific error state
    } finally {
      setIsLoading(false);
    }
  }, [toast]);


  const normalizeFileType = (mimeType: string | undefined): string => {
    if (!mimeType) return "application/octet-stream"; // Default MIME type
    const typeMap: { [key: string]: string } = {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'application/vnd.word',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'application/vnd.excel',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'application/vnd.powerpoint'
    };
    
    return typeMap[mimeType] || mimeType;
  };

  const getSimpleFileType = (mimeType?: string) => {
    if (!mimeType) return "Arquivo";
    if (mimeType.includes("pdf")) return "pdf";
    if (mimeType.includes("word")) return "docx";
    if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "xlsx";
    if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) return "pptx";
    if (mimeType.includes("zip")) return "zip";
    if (mimeType.includes("rar")) return "rar";
    if (mimeType.startsWith("image/")) return "imagem";
    return mimeType.split("/")[1] || "Arquivo";
  };

  const canPreviewFile = (file: FileItem) => {
    return file.mimeType?.startsWith("image/") || 
           file.mimeType?.includes("pdf") ||
           file.mimeType?.includes("word") ||
           file.mimeType?.includes("excel") ||
           file.mimeType?.includes("spreadsheet") ||
           file.mimeType?.includes("powerpoint") ||
           file.mimeType?.includes("presentation") ||
           file.mimeType === "text/plain"; // Added text/plain
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const createFolder = async (name: string, parentId: string | null) => {
    if (!name.trim()) {
      toast({ title: "Erro", description: "Nome da pasta não pode ser vazio.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetchApi('/files/create_folder.php', {
        method: 'POST',
        body: JSON.stringify({ name, parentId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falha ao criar pasta.");
      }
      toast({ title: "Pasta Criada", description: `Pasta "${data.name}" criada com sucesso.` });
      await fetchFilesAndFolders(parentId); // Recarregar a lista da pasta atual
    } catch (error: any) {
      console.error("Error creating folder:", error);
      toast({ title: "Erro ao Criar Pasta", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Handles individual file uploads (e.g., from a file input dialog, not folder drag/drop)
  const uploadFiles = async (selectedFiles: File[], parentId: string | null) => {
    if (selectedFiles.length === 0) return;

    setIsLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const file of selectedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      if (parentId) {
        formData.append('parentId', parentId);
      }
      // formData.append('webkitRelativePath', file.webkitRelativePath || ''); // Opcional se este endpoint for genérico

      try {
        const response = await fetchWithFormData('/files/upload.php', formData, { method: 'POST' });
        const data = await response.json();
        if (!response.ok) {
          errorCount++;
          console.error(`Error uploading ${file.name}:`, data.error);
          toast({ title: `Erro no Upload de ${file.name}`, description: data.error || "Falha no servidor.", variant: "destructive", duration: 5000 });
        } else {
          successCount++;
        }
      } catch (error: any) {
        errorCount++;
        console.error(`Error uploading ${file.name}:`, error);
        toast({ title: `Erro de Rede no Upload de ${file.name}`, description: error.message, variant: "destructive", duration: 5000 });
      }
    }
    setIsLoading(false);
    if (successCount > 0) {
      toast({ title: "Upload Concluído", description: `${successCount} arquivo(s) enviado(s) com sucesso.` });
    }
    if (successCount > 0 || errorCount > 0) { // Recarrega se algo foi tentado
      await fetchFilesAndFolders(parentId);
    }
  };

  const deleteFile = async (fileToDelete: FileItem, currentFolderId: string | null) => {
    if (!fileToDelete.id) {
      toast({ title: "Erro ao Excluir", description: "Arquivo inválido ou sem ID.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const body = JSON.stringify({ id: fileToDelete.id });
      console.log("[deleteFile] Enviando para backend:", body);
      const response = await fetchApi('/files/delete.php', {
        method: 'POST',
        body,
      });
      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        console.error("[deleteFile] Erro ao fazer parse do JSON:", parseErr, response);
        toast({ title: "Erro ao Excluir", description: "Resposta inesperada do servidor (não é JSON)", variant: "destructive" });
        return;
      }
      if (!response.ok) {
        throw new Error(data.error || "Falha ao excluir item.");
      }
      toast({ title: "Item Excluído", description: data.message || `"${fileToDelete.name}" foi excluído.` });
      await fetchFilesAndFolders(currentFolderId); // Recarregar a pasta atual
    } catch (error: any) {
      console.error("[deleteFile] Error:", error);
      toast({ title: "Erro ao Excluir", description: error.message || String(error), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const renameFile = async (fileId: string, newName: string, currentFolderId: string | null) => {
    if (!newName.trim()) {
      toast({ title: "Erro", description: "Novo nome não pode ser vazio.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetchApi('/files/rename.php', {
        method: 'POST',
        body: JSON.stringify({ id: fileId, newName }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falha ao renomear item.");
      }
      toast({ title: "Item Renomeado", description: data.message || `Item renomeado para "${newName}".` });
      await fetchFilesAndFolders(currentFolderId); // Recarregar
    } catch (error: any) {
      console.error("Error renaming file:", error);
      toast({ title: "Erro ao Renomear", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Download é tratado pelo backend. O frontend apenas precisa do URL.
  // file.url já virá formatado do backend (ex: /api/files/download.php?id=...).
  const downloadFile = (file: FileItem) => {
    if (file.url && file.url !== "#") {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download iniciado",
        description: `Fazendo download de ${file.name}`,
      });
    } else {
      toast({
        title: "Erro no download",
        description: "Arquivo não disponível para download",
        variant: "destructive"
      });
    }
  };

  return {
    files, // Agora representa os arquivos da pasta atual ou resultados da busca
    isLoading, // Para feedback de UI durante chamadas de API
    fetchFilesAndFolders, // Para carregar/recarregar o conteúdo da pasta
    normalizeFileType,
    getSimpleFileType,
    canPreviewFile,
    formatFileSize,
    createFolder,
    uploadFiles, // Para upload de arquivos individuais (via diálogo)
    deleteFile,
    renameFile,
    downloadFile
    // As funções de upload de pasta (drag-n-drop, botão de pasta)
    // serão implementadas/adaptadas em FileExplorer/index.tsx,
    // mas podem chamar uploadFiles internamente para cada arquivo da pasta.
  };
};