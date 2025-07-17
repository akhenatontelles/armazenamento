import { useState, useEffect } from "react";
import { FileItem } from "./types";
import { FileIcon } from "./FileIcon";
import { Button } from "@/components/ui/button";
import { Trash2, Download } from "lucide-react";

interface FileListProps {
  selectedFolderId: string | null;
  onFileClick: (file: FileItem) => void;
}

export const FileList = ({ selectedFolderId, onFileClick }: FileListProps) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFiles();
  }, [selectedFolderId]);

  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/armarzenamento/backend/api/files/list.php?folderId=${selectedFolderId || ''}`
      );
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Erro ao carregar arquivos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <span className="loading loading-spinner"></span>
        </div>
      ) : (
        files.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between p-3 bg-card rounded-lg hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-3 flex-1">
              <FileIcon file={file} />
              <div className="flex flex-col">
                <span className="font-medium truncate">{file.name}</span>
                <span className="text-sm text-muted-foreground">
                  {file.type === "folder" ? "Pasta" : formatFileSize(file.size)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFileClick(file)}
                className="p-1"
              >
                <Download className="w-4 h-4" />
              </Button>
              {file.type === "file" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
