import { useState, useRef } from "react";
import { FileUploadDialog } from "./FileUploadDialog";
import { FilePreviewModal } from "./FilePreviewModal";
import { FileList } from "./FileList";
import { FileItem } from "./types";
import { FileIcon } from "./FileIcon";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface FileExplorerProps {
  selectedFolderId: string | null;
  onFileSelect: (file: FileItem) => void;
}

export const FileExplorer = ({ selectedFolderId, onFileSelect }: FileExplorerProps) => {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (files: FileList) => {
    setSelectedFiles(Array.from(files));
    setIsUploadDialogOpen(true);
  };

  const handleDrop = (files: FileList) => {
    setSelectedFiles(Array.from(files));
    setIsUploadDialogOpen(true);
  };

  const handleFileUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Nenhum arquivo selecionado');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('parentId', selectedFolderId || '');
        formData.append('webkitRelativePath', '');

        const response = await fetch('/armarzenamento/backend/api/files/upload.php', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erro ao fazer upload: ${errorText}`);
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Erro desconhecido no upload');
        }
      }

      // Atualizar a lista de arquivos
      onFileSelect({
        id: selectedFolderId || '',
        name: '',
        type: 'folder',
        createdAt: new Date()
      });
      
      setIsUploadDialogOpen(false);
      setSelectedFiles([]);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao fazer upload');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileClick = (file: FileItem) => {
    if (file.type === "file") {
      setPreviewFile(file);
      setIsPreviewModalOpen(true);
    } else {
      onFileSelect(file);
    }
  };

  const canPreviewFile = (file: FileItem) => {
    if (!file.mimeType) return false;
    
    // Tipos de arquivos que podem ser visualizados
    return [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif'
    ].includes(file.mimeType);
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const response = await fetch(`/armarzenamento/backend/api/files/download.php?id=${file.id}`);
      if (!response.ok) throw new Error('Erro ao baixar arquivo');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-end mb-4">
        <div
          className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg bg-gray-50 hover:bg-gray-100"
          onDrop={async (e) => {
            e.preventDefault();
            let files: File[] = [];
            if (e.dataTransfer.items) {
              // Chrome/Edge: permite arrastar pastas e arquivos
              for (let i = 0; i < e.dataTransfer.items.length; i++) {
                const item = e.dataTransfer.items[i];
                if (item.kind === 'file') {
                  const file = item.getAsFile();
                  if (file) files.push(file);
                }
              }
            } else {
              // Fallback para browsers antigos
              files = Array.from(e.dataTransfer.files);
            }
            setSelectedFiles(files);
            setIsUploadDialogOpen(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => setIsUploadDialogOpen(true)}
        >
          <p className="text-gray-500 text-center">
            Arraste e solte arquivos aqui ou clique para selecionar
          </p>
        </div>
      </div>

      <FileUploadDialog
        isOpen={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        selectedFiles={selectedFiles}
        onSelectedFilesChange={setSelectedFiles}
        onFileUpload={handleFileUpload}
        parentId={selectedFolderId || ''}
        webkitRelativePath=""
        onFileUploaded={onFileSelect}
        onClose={() => setIsUploadDialogOpen(false)}
        setIsUploading={setIsUploading}
        setError={setError}
        API_BASE_URL="/armarzenamento/backend/api"
        isUploading={isUploading}
      />

      {error && (
        <div className="text-red-500 mb-4">
          {error}
        </div>
      )}

      <FileList
        selectedFolderId={selectedFolderId}
        onFileClick={handleFileClick}
      />

      {previewFile && (
        <FilePreviewModal
          isOpen={isPreviewModalOpen}
          onOpenChange={setIsPreviewModalOpen}
          file={previewFile}
          onDownload={handleDownload}
          canPreviewFile={canPreviewFile}
        />
      )}
    </div>
  );
};
