import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

interface FileUploadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFiles: File[];
  onSelectedFilesChange: (files: File[]) => void;
  parentId: string;
  webkitRelativePath: string;
  onFileUploaded: (data: any) => void;
  onClose: () => void;
  setIsUploading: (isUploading: boolean) => void;
  setError: (error: string) => void;
  API_BASE_URL: string;
  onFileUpload: () => void;
  isUploading: boolean;
}

export const FileUploadDialog = ({
  isOpen,
  onOpenChange,
  selectedFiles,
  onSelectedFilesChange,
  parentId,
  webkitRelativePath,
  onFileUploaded,
  onClose,
  setIsUploading,
  setError,
  API_BASE_URL,
  onFileUpload,
  isUploading
}: FileUploadDialogProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList) => {
    onSelectedFilesChange(Array.from(files));
    onFileUpload();
  };

  const handleUpload = async () => {
    try {
      setIsUploading(true);
      setError('');
      
      for (const file of selectedFiles) {
  console.log('Enviando arquivo:', file);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('parentId', parentId || '');
        formData.append('webkitRelativePath', webkitRelativePath || '');

        const response = await fetch(`${API_BASE_URL}/backend/api/files/upload.php`, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error('Erro ao fazer upload do arquivo');
        }

        const data = await response.json();
        onFileUploaded(data);
      }

      onSelectedFilesChange([]);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro desconhecido ao fazer upload');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="mega-button-primary">
          📤 Upload
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar Arquivos</DialogTitle>
          <DialogDescription id="upload-desc">
            Selecione ou arraste arquivos para enviar para a pasta atual.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Selecionar arquivos</Label>
            <Input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => handleFileSelect(e.target.files!)}
              className="mega-input"
            />
          </div>
          {isUploading && (
            <div className="flex flex-col items-center justify-center my-4">
              <svg className="animate-spin h-8 w-8 text-blue-600 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
              <span className="text-blue-600 font-semibold">Enviando arquivos...</span>
            </div>
          )}
          {selectedFiles.length > 0 && !isUploading && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                {selectedFiles.length} arquivo(s) selecionado(s)
              </p>
              <Button onClick={handleUpload} className="mega-button-primary w-full" disabled={isUploading}>
                Enviar Arquivos
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};