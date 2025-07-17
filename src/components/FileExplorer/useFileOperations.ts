import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { FileItem } from "./types";
import { fetchApi, fetchWithFormData } from "@/config";

export const useFileOperations = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchFilesAndFolders = useCallback(async (folderId: string | null) => {
    setIsLoading(true);
    try {
      const response = await fetchApi(`/files/list.php?folder_id=${folderId || ''}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erro ao buscar arquivos." }));
        throw new Error(errorData.error || "Falha ao buscar arquivos.");
      }
      const data: FileItem[] = await response.json();
      const processedData = data.map(item => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      }));
      setFiles(processedData);
    } catch (error: any) {
      toast({ title: "Erro ao Carregar Arquivos", description: error.message, variant: "destructive" });
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const uploadFiles = useCallback(async (selectedFiles: File[], parentId: string | null) => {
    if (selectedFiles.length === 0) return;

    setIsLoading(true);
    const uploadPromises = selectedFiles.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      if (parentId) {
        formData.append('parentId', parentId);
      }

      try {
        const response = await fetchWithFormData('/files/upload.php', formData, { method: 'POST' });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || `Falha no upload de ${file.name}`);
        }
        return { success: true, file: file.name };
      } catch (error: any) {
        toast({
          title: `Erro no Upload de ${file.name}`,
          description: error.message,
          variant: "destructive",
        });
        return { success: false, file: file.name };
      }
    });

    const results = await Promise.all(uploadPromises);
    const successCount = results.filter(r => r.success).length;

    if (successCount > 0) {
      toast({
        title: "Upload Concluído",
        description: `${successCount} de ${selectedFiles.length} arquivo(s) enviado(s) com sucesso.`,
      });
      await fetchFilesAndFolders(parentId);
    }

    setIsLoading(false);
  }, [toast, fetchFilesAndFolders]);

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
      await fetchFilesAndFolders(parentId);
    } catch (error: any) {
      toast({ title: "Erro ao Criar Pasta", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteFile = async (fileToDelete: FileItem, currentFolderId: string | null) => {
    setIsLoading(true);
    try {
      const response = await fetchApi('/files/delete.php', {
        method: 'POST',
        body: JSON.stringify({ id: fileToDelete.id }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falha ao excluir item.");
      }
      toast({ title: "Item Excluído", description: data.message || `"${fileToDelete.name}" foi excluído.` });
      await fetchFilesAndFolders(currentFolderId);
    } catch (error: any) {
      toast({ title: "Erro ao Excluir", description: error.message, variant: "destructive" });
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
      await fetchFilesAndFolders(currentFolderId);
    } catch (error: any) {
      toast({ title: "Erro ao Renomear", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

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

  const canPreviewFile = (file: FileItem) => {
    return file.mimeType?.startsWith("image/") ||
           file.mimeType?.includes("pdf") ||
           file.mimeType === "text/plain";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };


  return {
    files,
    isLoading,
    fetchFilesAndFolders,
    uploadFiles,
    createFolder,
    deleteFile,
    renameFile,
    downloadFile,
    canPreviewFile,
    formatFileSize
  };
};